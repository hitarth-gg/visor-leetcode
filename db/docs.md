# DB Generation

```sql
-- migration.sql

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS problems (
  id BIGINT PRIMARY KEY,
  url TEXT,
  title TEXT,
  difficulty TEXT,
  acceptance REAL,
  frequency REAL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_problems (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  source_file TEXT, -- e.g. "all", "thirty-days" etc (optional)
  timeframe_tag TEXT, -- e.g. "thirty-days", "three-months", "six-months" or NULL
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (company_id, problem_id)
);

-- tags for problems (many-to-many by tag text)
CREATE TABLE IF NOT EXISTS problem_tags (
  problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (problem_id, tag)
);

-- simple indexes
CREATE INDEX IF NOT EXISTS idx_problems_title ON problems(title);
CREATE INDEX IF NOT EXISTS idx_company_problems_timeframe ON company_problems(timeframe_tag);
```

# User Completed Problems

```sql
CREATE TABLE IF NOT EXISTS user_completed_problems (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id BIGINT REFERENCES problems(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_id, problem_id)
);
```
