import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  ICellRendererParams,
  ITooltipParams,
} from "ag-grid-community";
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
} from "ag-grid-community";

import { supabase } from "~/supabase/supabaseClient";
import { ArrowUpRight, CheckCircle2, CheckCheck } from "lucide-react";
import { useAppContext } from "~/context/useAppContext";
import { Badge } from "~/components/ui/badge";
import { getCompanyColor } from "~/utils/companyColors";
import { cn } from "~/lib/utils";
import { Separator } from "~/components/ui/separator";
import { TagFilterDropdown } from "~/components/TagFilterDropdown";

ModuleRegistry.registerModules([AllCommunityModule]);

/* ------------------------------------------------------ */
/*                          Types                         */
/* ------------------------------------------------------ */
type Difficulty = "Easy" | "Medium" | "Hard";

type Problem = {
  id: number;
  title: string;
  url: string | null;
  difficulty: Difficulty | null;
  acceptance: number | null;
  frequency: number | null;
  tags: string[];
  companies: string[];
  completed: boolean;
  isToggling?: boolean;
};

/* ------------------------------------------------------ */
/*                        Constants                       */
/* ------------------------------------------------------ */
const DIFFICULTY_ORDER: Record<string, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: "text-emerald-500 bg-emerald-500/10",
  Medium: "text-amber-500 bg-amber-500/10",
  Hard: "text-rose-500 bg-rose-500/10",
};

/* ------------------------------------------------------ */
/*                     Cell Renderers                     */
/* ------------------------------------------------------ */
function CompletedCellRenderer(props: ICellRendererParams<Problem>) {
  const { value, data, api } = props;

  if (!data) return null;

  const isLoading = (data as any).isToggling;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      alert("Please sign in to manage completed problems.");
      return;
    }

    const userId = session.user.id;
    const problemId = data.id;
    const newCompleted = !value;

    api.applyTransaction({ update: [{ ...data, isToggling: true }] });
    api.refreshCells({ rowNodes: [props.node], force: true });

    try {
      if (newCompleted) {
        const { error } = await supabase
          .from("user_completed_problems")
          .insert({ user_id: userId, problem_id: problemId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_completed_problems")
          .delete()
          .eq("user_id", userId)
          .eq("problem_id", problemId);
        if (error) throw error;
      }

      // When unchecked, remove the row from the grid since this page only shows completed
      if (!newCompleted) {
        api.applyTransaction({ remove: [data] });
      } else {
        api.applyTransaction({
          update: [{ ...data, completed: newCompleted, isToggling: false }],
        });
      }
    } catch (err) {
      console.error("Toggle failed:", err);
      api.applyTransaction({
        update: [{ ...data, completed: value, isToggling: false }],
      });
    }
  };

  return (
    <div
      className={`flex h-full items-center ${
        isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
      onClick={handleToggle}
    >
      {isLoading ? (
        <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
      ) : value ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <div className="border-border h-4 w-4 rounded-full border" />
      )}
    </div>
  );
}

function TitleCellRenderer({ data }: ICellRendererParams<Problem>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center">
      {data.url ? (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary group inline-flex items-center gap-1 text-sm font-medium transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {data.title}
          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
        </a>
      ) : (
        <span className="text-sm font-medium">{data.title}</span>
      )}
    </div>
  );
}

function DifficultyBadgeCellRenderer({ value }: ICellRendererParams) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex h-full items-center">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          DIFFICULTY_STYLES[value] ?? "text-muted-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function AcceptanceCellRenderer({ value }: ICellRendererParams) {
  return (
    <div className="text-muted-foreground flex h-full items-center text-xs tabular-nums">
      {value != null ? `${Number(value).toFixed(1)}%` : "—"}
    </div>
  );
}

function FrequencyCellRenderer({ value }: ICellRendererParams) {
  if (value == null)
    return (
      <div className="text-muted-foreground flex h-full items-center text-xs">
        —
      </div>
    );
  return (
    <div className="flex h-full items-center gap-1.5">
      <div className="bg-muted h-1.5 w-14 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-muted-foreground text-xs tabular-nums">
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

function TagsTooltip({ value }: ITooltipParams<Problem, string[]>) {
  if (!value || value.length === 0) return null;
  return (
    <div className="bg-background rounded-md border p-2 shadow-lg">
      <div className="flex max-w-xs flex-wrap gap-1">
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-muted-foreground text-xs"
          >
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function TagsCellRenderer({ value }: ICellRendererParams<Problem, string[]>) {
  if (!value || value.length === 0) return null;
  return (
    <div className="flex h-full flex-wrap items-center gap-x-1">
      {value.slice(0, 3).map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="text-muted-foreground my-0 px-2"
        >
          {tag}
        </Badge>
      ))}
      {value.length > 3 && (
        <span className="text-muted-foreground text-[10px]">
          +{value.length - 3}
        </span>
      )}
    </div>
  );
}

function CompaniesTooltip({ value }: ITooltipParams<Problem, string[]>) {
  if (!value || value.length === 0) return null;
  return (
    <div className="bg-background rounded-md border p-2 shadow-lg">
      <div className="flex max-w-xs flex-wrap gap-1">
        {value.map((name) => (
          <Badge
            key={name}
            variant="outline"
            className={cn(
              "text-muted-foreground text-xs",
              getCompanyColor(name),
            )}
          >
            {name}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function CompaniesCellRenderer({
  value,
}: ICellRendererParams<Problem, string[]>) {
  if (!value || value.length === 0) return null;
  return (
    <div className="flex h-full flex-wrap items-center gap-x-0.5 gap-y-0">
      {value.slice(0, 3).map((name) => (
        <Badge
          key={name}
          variant="outline"
          className={cn("text-muted-foreground my-0", getCompanyColor(name))}
        >
          {name}
        </Badge>
      ))}
      {value.length > 3 && (
        <span className="text-muted-foreground text-[10px]">
          +{value.length - 3}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------ */
/*                     Main Component                     */
/* ------------------------------------------------------ */
export default function Profile() {
  const { theme } = useAppContext();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState<Difficulty | "All">("All");

  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<"AND" | "OR">("AND");

  const gridRef = useRef<AgGridReact<Problem>>(null);

  /* ------------------------ Fetch ----------------------- */
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      const userId = session.user.id;

      const { data, error } = await supabase
        .from("user_completed_problems")
        .select(
          `
          problem:problems (
            id,
            title,
            url,
            difficulty,
            acceptance,
            frequency,
            problem_tags ( tag ),
            company_problems (
              company:companies ( id, name )
            )
          )
        `,
        )
        .eq("user_id", userId);

      if (error || !data) {
        setError("Failed to fetch completed problems.");
        setLoading(false);
        return;
      }

      const assembled: Problem[] = data.map((row: any) => {
        const p = row.problem;
        return {
          id: p.id,
          title: p.title ?? "Untitled",
          url: p.url ?? null,
          difficulty: p.difficulty ?? null,
          acceptance: p.acceptance ?? null,
          frequency: p.frequency ?? null,
          tags: p.problem_tags?.map((t: any) => t.tag) ?? [],
          companies:
            p.company_problems
              ?.map((cp: any) => cp.company?.name)
              .filter(Boolean) ?? [],
          completed: true,
          isToggling: false,
        };
      });

      setProblems(assembled);
      setLoading(false);
    }

    fetchData();
  }, []);

  useEffect(() => {
    async function fetchTags() {
      const { data, error } = await supabase
        .from("unique_problem_tags")
        .select("*");
      if (error || !data) return;
      setAllTags(data.map((t) => t.tag));
    }
    fetchTags();
  }, []);

  /* ----------------------- Filters ---------------------- */
  useEffect(() => {
    if (!gridRef.current?.api) return;
    gridRef.current.api.setGridOption("quickFilterText", search);
    gridRef.current.api.onFilterChanged();
  }, [search, diffFilter, selectedTags, tagMatchMode]);

  const isExternalFilterPresent = useCallback(() => {
    return diffFilter !== "All" || selectedTags.length > 0;
  }, [diffFilter, selectedTags]);

  const doesExternalFilterPass = useCallback(
    (node: { data?: Problem }) => {
      const problem = node.data;
      if (!problem) return false;

      if (diffFilter !== "All" && problem.difficulty !== diffFilter)
        return false;

      if (selectedTags.length > 0) {
        const problemTags = problem.tags ?? [];
        if (tagMatchMode === "AND") {
          if (!selectedTags.every((tag) => problemTags.includes(tag)))
            return false;
        } else {
          if (!selectedTags.some((tag) => problemTags.includes(tag)))
            return false;
        }
      }

      return true;
    },
    [diffFilter, selectedTags, tagMatchMode],
  );

  /* --------------------- Column Defs -------------------- */
  const columnDefs = useMemo<ColDef<Problem>[]>(
    () => [
      {
        field: "completed",
        headerName: "",
        headerTooltip: "Uncheck to remove from completed",
        width: 48,
        minWidth: 48,
        maxWidth: 48,
        sortable: false,
        filter: false,
        cellRenderer: CompletedCellRenderer,
        pinned: "left",
      },
      {
        field: "id",
        headerName: "#",
        width: 72,
        minWidth: 60,
        comparator: (a, b) => a - b,
      },
      {
        field: "title",
        headerName: "Title",
        flex: 2,
        minWidth: 200,
        cellRenderer: TitleCellRenderer,
        getQuickFilterText: (params) => params.value,
      },
      {
        field: "difficulty",
        headerName: "Difficulty",
        width: 120,
        cellRenderer: DifficultyBadgeCellRenderer,
        comparator: (a, b) =>
          (DIFFICULTY_ORDER[a ?? ""] ?? 99) - (DIFFICULTY_ORDER[b ?? ""] ?? 99),
      },
      {
        field: "acceptance",
        headerName: "Acceptance",
        width: 110,
        cellRenderer: AcceptanceCellRenderer,
        comparator: (a, b) => (a ?? -1) - (b ?? -1),
      },
      {
        field: "frequency",
        headerName: "Frequency",
        headerTooltip: "How frequently this problem is asked.",
        width: 120,
        sort: "desc",
        cellRenderer: FrequencyCellRenderer,
        comparator: (a, b) => (a ?? -1) - (b ?? -1),
      },
      {
        field: "tags",
        headerName: "Tags",
        flex: 1.5,
        minWidth: 150,
        sortable: false,
        filter: false,
        cellRenderer: TagsCellRenderer,
        tooltipComponent: TagsTooltip,
        tooltipValueGetter: (params) => params.value,
      },
      {
        field: "companies",
        headerName: "Companies",
        flex: 1.5,
        minWidth: 150,
        filter: false,
        cellRenderer: CompaniesCellRenderer,
        comparator: (a, b) => (b?.length ?? 0) - (a?.length ?? 0),
        tooltipComponent: CompaniesTooltip,
        tooltipValueGetter: (params) => params.value,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: false,
      resizable: true,
      suppressMovable: false,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  /* ------------------------ Stats ----------------------- */
  const easyCnt = problems.filter((p) => p.difficulty === "Easy").length;
  const medCnt = problems.filter((p) => p.difficulty === "Medium").length;
  const hardCnt = problems.filter((p) => p.difficulty === "Hard").length;

  /* -------------------- Loading / Error ----------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-primary h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <CheckCheck className="text-muted-foreground h-10 w-10" />
        <p className="text-muted-foreground text-sm">
          Please sign in to view your completed problems.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="font-geist bg-background text-primary flex flex-col">
      {/* Header */}
      <div className="border-border border-b px-6 py-6">
        <div className="mx-auto sm:px-8 md:px-16">
          <div className="flex items-center justify-between gap-4">
            {/* Title */}
            <div>
              <p className="text-muted-foreground flex items-center gap-1 text-xs tracking-wide">
                <CheckCheck className="text-muted-foreground mr-1 mb-1 inline h-4 w-4" />
                Progress
              </p>
              <h1 className="text-3xl font-semibold">Completed Problems</h1>
            </div>

            {/* Stats */}
            <div className="flex flex-col items-center">
              <div className="flex gap-6">
                {[
                  { label: "Easy", count: easyCnt, style: "text-emerald-500" },
                  { label: "Medium", count: medCnt, style: "text-amber-500" },
                  { label: "Hard", count: hardCnt, style: "text-rose-500" },
                ].map(({ label, count, style }) => (
                  <div key={label} className="text-center">
                    <div
                      className={`text-sm font-semibold tabular-nums sm:text-2xl ${style}`}
                    >
                      {count}
                    </div>
                    <div className="text-muted-foreground text-xs">{label}</div>
                  </div>
                ))}
              </div>
              <Separator className="mt-1.5" />
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                {problems.length} problems completed
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-2">
            <input
              type="text"
              placeholder="Filter problems…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-muted/20 border-border text-primary placeholder:text-muted-foreground h-8 rounded-md border px-3 text-sm outline-none focus:ring-1 focus:ring-white/10"
            />
            <div className="flex items-center gap-1">
              {(["All", "Easy", "Medium", "Hard"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDiffFilter(d)}
                  className={`h-7 cursor-pointer rounded-md px-3 text-xs font-medium transition-colors ${
                    diffFilter === d
                      ? d === "All"
                        ? "bg-primary text-primary-foreground"
                        : d === "Easy"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : d === "Medium"
                            ? "bg-amber-500/20 text-amber-500"
                            : "bg-rose-500/20 text-rose-500"
                      : "text-muted-foreground hover:text-primary hover:bg-muted/40"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <Separator orientation="vertical" className="h-5" />
            <TagFilterDropdown
              allTags={allTags}
              selectedTags={selectedTags}
              setSelectedTags={setSelectedTags}
              tagMatchMode={tagMatchMode}
              setTagMatchMode={setTagMatchMode}
            />
          </div>
        </div>
      </div>

      {/* Empty state */}
      {problems.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <CheckCheck className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No completed problems yet. Start solving!
          </p>
        </div>
      )}

      {/* AG Grid */}
      {problems.length > 0 && (
        <div className="flex-1 px-6 py-4">
          <div
            className="max-w-9xl mx-auto"
            style={{ height: "calc(100vh - 260px)" }}
          >
            <div
              className={`h-full w-full ${
                theme === "light" ? "ag-theme-quartz" : "ag-theme-quartz-dark"
              }`}
            >
              <AgGridReact
                ref={gridRef}
                rowData={problems}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                rowHeight={56}
                tooltipShowDelay={300}
                tooltipShowMode="standard"
                headerHeight={40}
                theme={themeQuartz
                  .withParams({ cellFontFamily: "geist, sans-serif" })
                  .withParams(
                    theme === "light"
                      ? {
                          rowBorder: {
                            style: "solid",
                            width: "2px",
                            color: "#e5e7eb",
                          },
                        }
                      : {
                          rowBorder: {
                            style: "solid",
                            width: "1px",
                            color: "#2e3135",
                          },
                          rowHoverColor: "#151515",
                          backgroundColor: "#0a0a0a",
                          foregroundColor: "#bfbfbf",
                          browserColorScheme: "dark",
                        },
                  )}
                animateRows
                suppressCellFocus
                isExternalFilterPresent={isExternalFilterPresent}
                doesExternalFilterPass={doesExternalFilterPass}
                getRowId={(params) => params.data.id.toString()}
                onGridReady={(params) => {
                  params.api.setGridOption("quickFilterText", search);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
