export type Theme = "light" | "dark";

export type Problem = {
  id: number; // BIGINT in DB
  url?: string | null;
  title?: string | null;
  difficulty?: string | null;
  acceptance?: number | null;
  frequency?: number | null;
};

export type CompletedMap = Record<number, string>; // problem_id -> completed_at (ISO)
