package main

import (
	"bufio"
	"database/sql"
	"encoding/csv"
	"errors"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

const (
	// expected file names inside 'https://github.com/snehasishroy/leetcode-companywise-interview-questions'
	FileAll               = "all.csv"
	FileMoreThanSixMonths = "more-than-six-months.csv"
	FileSixMonths         = "six-months.csv"
	FileThreeMonths       = "three-months.csv"
	FileThirtyDays        = "thirty-days.csv"
)

/*
ID,URL,Title,Difficulty,Acceptance %,Frequency %
79,https://leetcode.com/problems/word-search,Word Search,Medium,46.8%,75.0%
*/

type RawProblem struct {
	ID         int64
	URL        string
	Title      string
	Difficulty string
	Acceptance sql.NullFloat64
	Frequency  sql.NullFloat64
	SourceFile string // to keep track of which file the problem came from
}

func parsePercent(s string) (sql.NullFloat64, error) {
	s = strings.TrimSpace(s) // Remove whitespace
	if s == "" {
		return sql.NullFloat64{Valid: false}, nil
	}
	// remove the '%' sign if it exists
	s = strings.TrimSuffix(s, "%")
	s = strings.TrimSpace(s) // Remove any whitespace after removing '%'

	if s == "" {
		return sql.NullFloat64{Valid: false}, nil
	}

	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return sql.NullFloat64{Valid: false}, err
	}
	return sql.NullFloat64{Float64: f, Valid: true}, nil
}

func readCSVFile(path string, sourceFile string) (map[int64]RawProblem, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close() // defer is used to ensure that the file is closed when the function returns

	r := csv.NewReader(bufio.NewReader(f))
	r.TrimLeadingSpace = true // trim leading space from fields
	records, err := r.ReadAll()
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, nil // no records, return empty map
	}

	// header -> index
	header := records[0]       // csv header row
	colIdx := map[string]int{} // create a mapping of column names to their indices

	for i, h := range header {
		h = strings.TrimSpace(h) // trim whitespace from header
		colIdx[h] = i            // we do this to later easily access columns by name, even if the order changes across files
	}

	// helper to get by header name (try multiple possible forms)
	getIndex := func(variants ...string) (int, bool) {
		for _, v := range variants {
			v = strings.TrimSpace(v)
			if idx, ok := colIdx[v]; ok {
				return idx, true
			}
		}
		return -1, false
	}

	idIdx, ok := getIndex("ID", "Id", "id")
	if !ok {
		return nil, errors.New("ID column not found")
	}
	urlIdx, _ := getIndex("URL", "Url", "url")
	titleIdx, _ := getIndex("Title", "title")
	difficultyIdx, _ := getIndex("Difficulty", "difficulty")
	acceptIdx, _ := getIndex("Acceptance %", "Acceptance%", "Acceptance %", "Acceptance")
	freqIdx, _ := getIndex("Frequency %", "Frequency%", "Frequency %", "Frequency")

	out := map[int64]RawProblem{}

	for i := 1; i < len(records); i++ {
		row := records[i]
		if idIdx >= len(row) { // unlikely, but just in case of a malformed row
			continue
		}
		idStr := strings.TrimSpace(row[idIdx])
		if idStr == "" {
			continue // skip rows with empty ID
		}
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			log.Printf("[WARNING]: skipping row with invalid ID '%s' in file '%s': %v", idStr, sourceFile, err)
			continue // skip rows with invalid ID
		}

		rp := RawProblem{
			ID:         id,
			URL:        "",
			Title:      "",
			Difficulty: "",
			SourceFile: sourceFile,
		}

		if urlIdx >= 0 && urlIdx < len(row) {
			rp.URL = strings.TrimSpace(row[urlIdx])
		}
		if titleIdx >= 0 && titleIdx < len(row) {
			rp.Title = strings.TrimSpace(row[titleIdx])
		}
		if difficultyIdx >= 0 && difficultyIdx < len(row) {
			rp.Difficulty = strings.TrimSpace(row[difficultyIdx])
		}
		if acceptIdx >= 0 && acceptIdx < len(row) {
			a, _ := parsePercent(row[acceptIdx])
			rp.Acceptance = a
		}
		if freqIdx >= 0 && freqIdx < len(row) {
			f, _ := parsePercent(row[freqIdx])
			rp.Frequency = f
		}

		out[id] = rp
	}
	return out, nil
}

func upsertCompany(db *sqlx.DB, name string) (int, error) {
	var id int
	err := db.Get(&id, `INSERT INTO companies (name) VALUES ($1)
	ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name
	RETURNING id`, name)

	if err != nil {
		// manually select the ID, if the error is due to RETURNING not being supported
		if strings.Contains(err.Error(), "RETURNING") {
			err = db.Get(&id, `SELECT id FROM companies WHERE name=$1`, name)
		}
	}
	return id, err
}

func nullableFloat64(n sql.NullFloat64) interface{} {
	if n.Valid {
		return n.Float64
	}
	return nil
}

func upsertProblem(tx *sqlx.Tx, p RawProblem) error {
	// acceptance and frequency can be null
	_, err := tx.Exec(`
	INSERT INTO problems (id, url, title, difficulty, acceptance, frequency, updated_at)
	VALUES ($1,$2,$3,$4,$5,$6, now())
	ON CONFLICT (id) DO UPDATE
	  SET url = EXCLUDED.url,
		  title = EXCLUDED.title,
		  difficulty = EXCLUDED.difficulty,
		  acceptance = EXCLUDED.acceptance,
		  frequency = EXCLUDED.frequency,
		  updated_at = now()
	`, p.ID, p.URL, p.Title, p.Difficulty, nullableFloat64(p.Acceptance), nullableFloat64(p.Frequency))
	return err
}

func upsertCompanyProblem(tx *sqlx.Tx, companyID int, problemID int64, sourceFile string, timeFrameTag *string) error {
	var tf interface{}
	if timeFrameTag != nil {
		tf = *timeFrameTag
	} else {
		tf = nil
	}
	_, err := tx.Exec(`
	INSERT INTO company_problems (company_id, problem_id, source_file, timeframe_tag, last_seen)
	VALUES ($1,$2,$3,$4, now())
	ON CONFLICT (company_id, problem_id) DO UPDATE
	  SET source_file = EXCLUDED.source_file,
	      timeframe_tag = EXCLUDED.timeframe_tag,
	      last_seen = now()
	`, companyID, problemID, sourceFile, tf)
	return err
}

func addProblemTag(db *sqlx.DB, problemID int64, tag string) error {
	_, err := db.Exec(`
	INSERT INTO problem_tags (problem_id, tag)
	VALUES ($1,$2)
	ON CONFLICT (problem_id, tag) DO NOTHING
	`, problemID, tag)
	return err
}

func scrapeGithubMain() {
	// using env vars
	godotenv.Load()

	dsn := os.Getenv("LOCAL_DATABASE_URL")
	root := os.Getenv("ROOT_DIR") // root directory where the CSV files are located
	if dsn == "" || root == "" {
		log.Fatalf("Please set LOCAL_DATABASE_URL and ROOT_DIR environment variables")
	}

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to db: %v", err)
	}
	defer db.Close()

	companies, err := os.ReadDir(root) // CAREFFUL ! .git folder
	if err != nil {
		log.Fatalf("Failed to read root directory: %v", err)
	}

	for _, c := range companies {
		if !c.IsDir() { // CAREFFUL ! .git folder
			continue
		}

		companyName := c.Name()

		if strings.HasPrefix(companyName, ".") { // skip hidden folders like .git
			continue
		}

		companyPath := filepath.Join(root, companyName)
		log.Printf("Processing company %s", companyName)

		// read all CSVs that exist for this company
		files := map[string]string{
			"all":           filepath.Join(companyPath, FileAll),
			"more-than-six": filepath.Join(companyPath, FileMoreThanSixMonths),
			"six-months":    filepath.Join(companyPath, FileSixMonths),
			"three-months":  filepath.Join(companyPath, FileThreeMonths),
			"thirty-days":   filepath.Join(companyPath, FileThirtyDays),
		}

		meta := map[int64]RawProblem{}
		// presence flags per time frame
		inThirtyDays := map[int64]bool{}
		inThreeMonths := map[int64]bool{}
		inSixMonths := map[int64]bool{}
		// track source files for last insert
		sourceFor := map[int64]string{}

		// helper to merge a file
		mergeFile := func(path string, sourceKey string) {
			m, err := readCSVFile(path, sourceKey)
			if err != nil {
				// file may not exist
				if os.IsNotExist(err) {
					return
				}
				log.Printf("Failed to read file %s: %v", path, err)
				return
			}
			for id, rp := range m {
				// prefer data from 'all', otherwise use the last seen source file
				if sourceKey == "all" {
					meta[id] = rp
				} else {
					// if not present in meta, store it; else keep existing meta
					if _, ok := meta[id]; !ok {
						meta[id] = rp
					}
				}
				sourceFor[id] = sourceKey // we will use this to determine the time frame tag when inserting into company_problems
				switch sourceKey {
				case "thirty-days":
					inThirtyDays[id] = true
				case "three-months":
					inThreeMonths[id] = true
				case "six-months":
					inSixMonths[id] = true
				}
			}
		}

		// order intentionally: all, more-than-six (ignored for timeframe), six, three, thirty
		mergeFile(files["all"], "all")
		mergeFile(files["more-than-six"], "more-than-six")
		mergeFile(files["six-months"], "six-months")
		mergeFile(files["three-months"], "three-months")
		mergeFile(files["thirty-days"], "thirty-days")

		// get or create company ID
		companyID, err := upsertCompany(db, companyName)
		if err != nil {
			log.Printf("Failed to upsert company %s: %v", companyName, err)
			continue
		}

		// start transaction for batch upsert per company
		tx, err := db.Beginx()
		if err != nil {
			log.Printf("begin tx %s: %v", companyName, err)
			continue
		}
		committed := false

		// loop over all problem IDs collected (meta keys)
		for id, rp := range meta {
			// upsert problem
			if err := upsertProblem(tx, rp); err != nil {
				log.Printf("Failed to upsert problem %d for company %s: %v", id, companyName, err)
				continue
			}

			// compute timeframe tag priority: thirty-days > three-months > six-months > all
			var timeFrameTag *string
			if inThirtyDays[id] {
				s := "thirty-days"
				timeFrameTag = &s
			} else if inThreeMonths[id] {
				s := "three-months"
				timeFrameTag = &s
			} else if inSixMonths[id] {
				s := "six-months"
				timeFrameTag = &s
			} else {
				timeFrameTag = nil // means it was only in 'all' or 'more-than-six', so no specific timeframe
			}

			src := sourceFor[id]
			if err := upsertCompanyProblem(tx, companyID, id, src, timeFrameTag); err != nil {
				log.Printf("upsert company_problem %s:%d: %v", companyName, id, err)
				continue
			}
		}
		if err := tx.Commit(); err != nil {
			log.Printf("commit tx %s: %v", companyName, err)
		} else {
			committed = true
		}
		if !committed {
			_ = tx.Rollback()
		}
		log.Printf("[DONE]: %s (%d problems)", companyName, len(meta))
	}
	log.Printf("All done!")

}
