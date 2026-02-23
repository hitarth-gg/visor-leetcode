package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

const (
	graphqlURL = "https://leetcode.com/graphql"
	// batchSize is how many problems we request in a single HTTP call using aliases.
	batchSize       = 40
	politeSleepMS   = 300 // milliseconds between batch requests
	httpTimeoutSecs = 20
)

type DBProblem struct {
	ID  int64  `db:"id"`
	URL string `db:"url"`
}

// GraphQL response dynamic mapping: keys are q0, q1, ...
type questionEntry struct {
	QuestionId string `json:"questionId"`
	TopicTags  []struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	} `json:"topicTags"`
}
type batchResponse struct {
	Data   map[string]questionEntry `json:"data"`
	Errors []interface{}            `json:"errors"`
}
type pslug struct {
	ID   int64
	Slug string
}

func scrapeTagsMain() {
	godotenv.Load()

	dsn := os.Getenv("LOCAL_DATABASE_URL")
	if dsn == "" {
		log.Fatalf("LOCAL_DATABASE_URL environment variable is required")
	}

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer db.Close()

	// Load problems that have URLs (so we can extract slug)
	var problems []DBProblem
	if err := db.Select(&problems, "SELECT id, url FROM problems WHERE url IS NOT NULL"); err != nil {
		log.Fatalf("select problems: %v", err)
	}
	log.Printf("Found %d problems with URLs in DB\n", len(problems))
	if len(problems) == 0 {
		return
	}

	// Build list of (id, slug)

	var items []pslug
	for _, p := range problems {
		slug := extractSlug(p.URL)
		if slug == "" {
			log.Printf("warning: problem %d has invalid url %q — skipping\n", p.ID, p.URL)
			continue
		}
		items = append(items, pslug{ID: p.ID, Slug: slug})
	}
	log.Printf("Prepared %d problems with valid slugs\n", len(items))

	client := &http.Client{Timeout: time.Second * httpTimeoutSecs}

	// Process in batches
	total := len(items)
	for i := 0; i < total; i += batchSize {
		j := i + batchSize
		if j > total {
			j = total
		}
		batch := items[i:j]
		log.Printf("Processing batch %d..%d (size %d)", i, j-1, len(batch))

		// Build GraphQL query with aliases q0, q1, ...
		q := buildBatchQuery(batch)
		respBody, err := doGraphQLRequest(client, q)
		if err != nil {
			log.Printf("GraphQL request failed for batch %d..%d: %v — skipping this batch", i, j-1, err)
			time.Sleep(time.Millisecond * politeSleepMS)
			continue
		}

		// Parse JSON into struct
		var br batchResponse
		if err := json.Unmarshal(respBody, &br); err != nil {
			log.Printf("json unmarshal failed for batch %d..%d: %v", i, j-1, err)
			time.Sleep(time.Millisecond * politeSleepMS)
			continue
		}

		// If GraphQL returned errors, log them (but still attempt to process data if present)
		if len(br.Errors) > 0 {
			log.Printf("GraphQL errors for batch %d..%d: %v", i, j-1, br.Errors)
		}

		// For each alias in the batch, map results and update DB per problem
		for idx, p := range batch {
			alias := fmt.Sprintf("q%d", idx)
			entry, ok := br.Data[alias]
			if !ok || entry.QuestionId == "" {
				// Missing -> skip and do not delete tags (safer)
				log.Printf("no data for problem id=%d slug=%s (alias=%s) — skipping", p.ID, p.Slug, alias)
				continue
			}

			// Collect tag names
			var tags []string
			for _, t := range entry.TopicTags {
				// use tag name; you can switch to t.Slug if preferred
				trimmed := strings.TrimSpace(t.Name)
				if trimmed != "" {
					tags = append(tags, trimmed)
				}
			}

			// Update DB for this problem: delete old tags, insert new tags, within a transaction
			if err := replaceProblemTags(db, p.ID, tags); err != nil {
				log.Printf("db update failed for problem %d: %v", p.ID, err)
			} else {
				log.Printf("updated problem %d with %d tags", p.ID, len(tags))
			}
		}

		// polite sleep between batch requests
		time.Sleep(time.Millisecond * politeSleepMS)
	}

	log.Println("Tag sync complete.")
}

// create a GraphQL query string with aliases q0..qN for the provided slugs.
func buildBatchQuery(batch []pslug) string {
	var sb strings.Builder
	sb.WriteString("query {\n")
	for i, p := range batch {
		// use strconv.Quote to safely produce a quoted, escaped string literal
		quoted := strconv.Quote(p.Slug)
		sb.WriteString(fmt.Sprintf("  q%d: question(titleSlug: %s) {\n", i, quoted))
		sb.WriteString("    questionId\n")
		sb.WriteString("    topicTags { name slug }\n")
		sb.WriteString("  }\n")
	}
	sb.WriteString("}\n")
	return sb.String()
}

func doGraphQLRequest(client *http.Client, query string) ([]byte, error) {
	bodyMap := map[string]interface{}{"query": query}
	bodyBytes, _ := json.Marshal(bodyMap)

	req, err := http.NewRequest("POST", graphqlURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	// set user agent to avoid potential filtering
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; tag-sync/1.0)")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Accept non-200 too (GraphQL commonly returns 200 even on errors); but if 429 or 5xx, return error
	if resp.StatusCode >= 500 || resp.StatusCode == 429 {
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	var respBytes []byte
	respBytes, err = ioReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return respBytes, nil
}

// replaceProblemTags deletes existing tags for problem_id and inserts the provided tags.
// It uses a transaction; if tags is empty it will delete all tags (clean sync).
func replaceProblemTags(db *sqlx.DB, problemID int64, tags []string) error {
	tx, err := db.Beginx()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if _, err = tx.Exec("DELETE FROM problem_tags WHERE problem_id = $1", problemID); err != nil {
		return err
	}

	// insert new tags
	for _, t := range tags {
		if _, err = tx.Exec(`
			INSERT INTO problem_tags (problem_id, tag)
			VALUES ($1, $2)
			ON CONFLICT (problem_id, tag) DO NOTHING
		`, problemID, t); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// extractSlug extracts the LeetCode title slug from a problem URL.
// Example: "https://leetcode.com/problems/word-search" -> "word-search"
func extractSlug(url string) string {
	if url == "" {
		return ""
	}
	parts := strings.Split(url, "/problems/")
	if len(parts) < 2 {
		return ""
	}
	// slug may contain trailing parts, e.g. /problems/x/ -> trim slashes and query
	s := parts[1]
	// remove trailing slash and any query params or fragments
	s = strings.SplitN(s, "/", 2)[0]
	s = strings.SplitN(s, "?", 2)[0]
	s = strings.SplitN(s, "#", 2)[0]
	return strings.TrimSpace(s)
}

// tiny wrapper for ioutil.ReadAll since io/ioutil is deprecated in newer go versions
func ioReadAll(r io.Reader) ([]byte, error) {
	return io.ReadAll(r)
}
