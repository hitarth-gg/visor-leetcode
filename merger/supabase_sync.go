package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

var (
	localDSN  = ""
	remoteDSN = ""
)

type Company struct {
	ID   int64          `db:"id"`
	Name sql.NullString `db:"name"`
}

type Problem struct {
	ID         int64           `db:"id"`
	URL        sql.NullString  `db:"url"`
	Title      sql.NullString  `db:"title"`
	Difficulty sql.NullString  `db:"difficulty"`
	Acceptance sql.NullFloat64 `db:"acceptance"`
	Frequency  sql.NullFloat64 `db:"frequency"`
	UpdatedAt  time.Time       `db:"updated_at"`
}

type ProblemTag struct {
	ProblemID int64     `db:"problem_id"`
	Tag       string    `db:"tag"`
	AddedAt   time.Time `db:"added_at"`
}

type CompanyProblem struct {
	CompanyID  int64          `db:"company_id"`
	ProblemID  int64          `db:"problem_id"`
	SourceFile sql.NullString `db:"source_file"`
	Timeframe  sql.NullString `db:"timeframe_tag"`
	LastSeen   time.Time      `db:"last_seen"`
}

func supabaseSyncMain() {
	godotenv.Load()
	localDSN = os.Getenv("LOCAL_DATABASE_URL")
	remoteDSN = os.Getenv("SUPABASE_DATABASE_URL")

	if localDSN == "" || remoteDSN == "" {
		log.Fatal("set LOCAL_DATABASE_URL and SUPABASE_DATABASE_URL env vars")
	}

	local, err := sqlx.Connect("postgres", localDSN)
	if err != nil {
		log.Fatalf("connect local: %v", err)
	}
	defer local.Close()

	remote, err := sqlx.Connect("postgres", remoteDSN)
	if err != nil {
		log.Fatalf("connect remote: %v", err)
	}
	defer remote.Close()

	remote.SetMaxOpenConns(10)
	remote.SetConnMaxLifetime(30 * time.Minute)

	ctx := context.Background()

	// Ensure schema exists on remote (run your migration.sql beforehand or uncomment call below)
	// if err := ensureSchema(remote, "migration.sql"); err != nil { log.Fatalf("ensure schema: %v", err) }

	log.Println("syncing companies (bulk)...")
	if err := bulkSyncCompanies(ctx, local, remote); err != nil {
		log.Fatalf("companies sync failed: %v", err)
	}
	log.Println("syncing problems (bulk)...")
	if err := bulkSyncProblems(ctx, local, remote); err != nil {
		log.Fatalf("problems sync failed: %v", err)
	}
	log.Println("syncing problem_tags (bulk)...")
	if err := bulkSyncProblemTags(ctx, local, remote); err != nil {
		log.Fatalf("problem_tags sync failed: %v", err)
	}
	log.Println("syncing company_problems (bulk)...")
	if err := bulkSyncCompanyProblems(ctx, local, remote); err != nil {
		log.Fatalf("company_problems sync failed: %v", err)
	}

	log.Println("fixing sequences...")
	if err := fixSerialSequence(remote, "companies", "id"); err != nil {
		log.Fatalf("fix sequence failed: %v", err)
	}

	log.Println("bulk sync complete")
}

// bulkSyncCompanies: copy into temp_companies then upsert into companies
func bulkSyncCompanies(ctx context.Context, local, remote *sqlx.DB) error {
	// start remote tx
	tx, err := remote.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// create temporary table (dropped at commit)
	if _, err := tx.Exec(`
CREATE TEMP TABLE temp_companies (
  id bigint,
  name text
) ON COMMIT DROP;
`); err != nil {
		return fmt.Errorf("create temp table: %w", err)
	}

	// prepare COPY INTO temp_companies (id, name)
	stmt, err := tx.Prepare(pq.CopyIn("temp_companies", "id", "name"))
	if err != nil {
		return fmt.Errorf("prepare copyin: %w", err)
	}

	// stream rows from local
	rows, err := local.QueryxContext(ctx, `SELECT id, name FROM companies`)
	if err != nil {
		stmt.Close()
		return fmt.Errorf("select local companies: %w", err)
	}
	defer rows.Close()

	var count int
	for rows.Next() {
		var c Company
		if err := rows.StructScan(&c); err != nil {
			stmt.Close()
			return fmt.Errorf("scan company: %w", err)
		}
		// pq.CopyIn accepts nil for NULLs
		var name interface{}
		if c.Name.Valid {
			name = c.Name.String
		} else {
			name = nil
		}
		if _, err := stmt.Exec(c.ID, name); err != nil {
			stmt.Close()
			return fmt.Errorf("copy exec company: %w", err)
		}
		count++
	}
	if _, err := stmt.Exec(); err != nil {
		stmt.Close()
		return fmt.Errorf("final copy exec: %w", err)
	}
	if err := stmt.Close(); err != nil {
		return fmt.Errorf("close copy stmt: %w", err)
	}

	// Upsert from temp into real table
	if _, err := tx.Exec(`
	INSERT INTO companies (id, name)
	SELECT id, name FROM temp_companies
	ON CONFLICT (id) DO UPDATE
		SET name = EXCLUDED.name;
`); err != nil {
		return fmt.Errorf("upsert companies: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit companies tx: %w", err)
	}
	log.Printf("companies copied: %d\n", count)
	return nil
}

// bulkSyncProblems: similar pattern
func bulkSyncProblems(ctx context.Context, local, remote *sqlx.DB) error {
	tx, err := remote.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`
CREATE TEMP TABLE temp_problems (
  id bigint,
  url text,
  title text,
  difficulty text,
  acceptance real,
  frequency real,
  updated_at timestamptz
) ON COMMIT DROP;
`); err != nil {
		return fmt.Errorf("create temp problems: %w", err)
	}

	stmt, err := tx.Prepare(pq.CopyIn("temp_problems", "id", "url", "title", "difficulty", "acceptance", "frequency", "updated_at"))
	if err != nil {
		return fmt.Errorf("prepare copyin problems: %w", err)
	}

	rows, err := local.QueryxContext(ctx, `SELECT id, url, title, difficulty, acceptance, frequency, updated_at FROM problems`)
	if err != nil {
		stmt.Close()
		return fmt.Errorf("select local problems: %w", err)
	}
	defer rows.Close()

	var count int
	for rows.Next() {
		var p Problem
		if err := rows.StructScan(&p); err != nil {
			stmt.Close()
			return fmt.Errorf("scan problem: %w", err)
		}
		var url, title, diff interface{}
		if p.URL.Valid {
			url = p.URL.String
		}
		if p.Title.Valid {
			title = p.Title.String
		}
		if p.Difficulty.Valid {
			diff = p.Difficulty.String
		}
		var acceptance, frequency interface{}
		if p.Acceptance.Valid {
			acceptance = p.Acceptance.Float64
		}
		if p.Frequency.Valid {
			frequency = p.Frequency.Float64
		}
		if _, err := stmt.Exec(p.ID, url, title, diff, acceptance, frequency, p.UpdatedAt); err != nil {
			stmt.Close()
			return fmt.Errorf("copy exec problem: %w", err)
		}
		count++
	}
	if _, err := stmt.Exec(); err != nil {
		stmt.Close()
		return fmt.Errorf("final copy exec problems: %w", err)
	}
	if err := stmt.Close(); err != nil {
		return fmt.Errorf("close stmt problems: %w", err)
	}

	if _, err := tx.Exec(`
	INSERT INTO problems (id, url, title, difficulty, acceptance, frequency, updated_at)
	SELECT id, url, title, difficulty, acceptance, frequency, updated_at FROM temp_problems
	ON CONFLICT (id) DO UPDATE
	  SET url = EXCLUDED.url,
	      title = EXCLUDED.title,
	      difficulty = EXCLUDED.difficulty,
	      acceptance = EXCLUDED.acceptance,
	      frequency = EXCLUDED.frequency,
	      updated_at = EXCLUDED.updated_at;
	`); err != nil {
		return fmt.Errorf("upsert problems: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit problems tx: %w", err)
	}
	log.Printf("problems copied: %d\n", count)
	return nil
}

func bulkSyncProblemTags(ctx context.Context, local, remote *sqlx.DB) error {
	tx, err := remote.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx tags: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`
	CREATE TEMP TABLE temp_problem_tags (
	  problem_id bigint,
	  tag text,
	  added_at timestamptz
	) ON COMMIT DROP;
	`); err != nil {
		return fmt.Errorf("create temp_problem_tags: %w", err)
	}

	stmt, err := tx.Prepare(pq.CopyIn("temp_problem_tags", "problem_id", "tag", "added_at"))
	if err != nil {
		return fmt.Errorf("prepare copyin tags: %w", err)
	}

	rows, err := local.QueryxContext(ctx, `SELECT problem_id, tag, added_at FROM problem_tags`)
	if err != nil {
		stmt.Close()
		return fmt.Errorf("select local tags: %w", err)
	}
	defer rows.Close()

	var count int
	for rows.Next() {
		var t ProblemTag
		if err := rows.StructScan(&t); err != nil {
			stmt.Close()
			return fmt.Errorf("scan tag: %w", err)
		}
		if _, err := stmt.Exec(t.ProblemID, t.Tag, t.AddedAt); err != nil {
			stmt.Close()
			return fmt.Errorf("copy exec tag: %w", err)
		}
		count++
	}
	if _, err := stmt.Exec(); err != nil {
		stmt.Close()
		return fmt.Errorf("final copy exec tags: %w", err)
	}
	if err := stmt.Close(); err != nil {
		return fmt.Errorf("close stmt tags: %w", err)
	}

	if _, err := tx.Exec(`
INSERT INTO problem_tags (problem_id, tag, added_at)
SELECT problem_id, tag, added_at FROM temp_problem_tags
ON CONFLICT (problem_id, tag) DO UPDATE
  SET added_at = EXCLUDED.added_at;
`); err != nil {
		return fmt.Errorf("upsert tags: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tags tx: %w", err)
	}
	log.Printf("problem_tags copied: %d\n", count)
	return nil
}

func bulkSyncCompanyProblems(ctx context.Context, local, remote *sqlx.DB) error {
	tx, err := remote.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx company_problems: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`
CREATE TEMP TABLE temp_company_problems (
  company_id integer,
  problem_id bigint,
  source_file text,
  timeframe_tag text,
  last_seen timestamptz
) ON COMMIT DROP;
`); err != nil {
		return fmt.Errorf("create temp_company_problems: %w", err)
	}

	stmt, err := tx.Prepare(pq.CopyIn("temp_company_problems", "company_id", "problem_id", "source_file", "timeframe_tag", "last_seen"))
	if err != nil {
		return fmt.Errorf("prepare copyin company_problems: %w", err)
	}

	rows, err := local.QueryxContext(ctx, `SELECT company_id, problem_id, source_file, timeframe_tag, last_seen FROM company_problems`)
	if err != nil {
		stmt.Close()
		return fmt.Errorf("select local company_problems: %w", err)
	}
	defer rows.Close()

	var count int
	for rows.Next() {
		var cp CompanyProblem
		if err := rows.StructScan(&cp); err != nil {
			stmt.Close()
			return fmt.Errorf("scan company_problem: %w", err)
		}
		var sourceFile, timeframe interface{}
		if cp.SourceFile.Valid {
			sourceFile = cp.SourceFile.String
		}
		if cp.Timeframe.Valid {
			timeframe = cp.Timeframe.String
		}
		if _, err := stmt.Exec(cp.CompanyID, cp.ProblemID, sourceFile, timeframe, cp.LastSeen); err != nil {
			stmt.Close()
			return fmt.Errorf("copy exec company_problem: %w", err)
		}
		count++
	}
	if _, err := stmt.Exec(); err != nil {
		stmt.Close()
		return fmt.Errorf("final copy exec company_problems: %w", err)
	}
	if err := stmt.Close(); err != nil {
		return fmt.Errorf("close stmt company_problems: %w", err)
	}

	if _, err := tx.Exec(`
INSERT INTO company_problems (company_id, problem_id, source_file, timeframe_tag, last_seen)
SELECT company_id, problem_id, source_file, timeframe_tag, last_seen FROM temp_company_problems
ON CONFLICT (company_id, problem_id) DO UPDATE
  SET source_file = EXCLUDED.source_file,
      timeframe_tag = EXCLUDED.timeframe_tag,
      last_seen = EXCLUDED.last_seen;
`); err != nil {
		return fmt.Errorf("upsert company_problems: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit company_problems tx: %w", err)
	}
	log.Printf("company_problems copied: %d\n", count)
	return nil
}

// fixSerialSequence sets sequences for SERIAL columns after upserting explicit IDs
func fixSerialSequence(remote *sqlx.DB, tableName, columnName string) error {
	q := fmt.Sprintf(
		"SELECT setval(pg_get_serial_sequence('%s','%s'), COALESCE((SELECT MAX(%s) FROM %s), 0))",
		tableName, columnName, columnName, tableName,
	)
	if _, err := remote.Exec(q); err != nil {
		return fmt.Errorf("fix sequence %s.%s: %w", tableName, columnName, err)
	}
	return nil
}
