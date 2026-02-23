import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router";
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
  TooltipModule,
} from "ag-grid-community";

import { supabase } from "~/supabase/supabaseClient";
import { ArrowUpRight, CheckCircle2, Building2 } from "lucide-react";
import { useAppContext } from "~/context/useAppContext";
import { Badge } from "~/components/ui/badge";
import { getCompanyColor } from "~/utils/companyColors";
import { cn } from "~/lib/utils";
import { Separator } from "~/components/ui/separator";
import { TagFilterDropdown } from "~/components/TagFilterDropdown";

ModuleRegistry.registerModules([AllCommunityModule]);

/* ─────────────────────────────────────────────────────────── */
/* Types */
/* ─────────────────────────────────────────────────────────── */
type Difficulty = "Easy" | "Medium" | "Hard";

type Problem = {
  id: number;
  title: string;
  url: string | null;
  difficulty: Difficulty | null;
  acceptance: number | null;
  frequency: number | null;
  tags: string[];
  other_companies: string[];
  completed: boolean;
  timeframe_tag: TimeFrameTag | null;
  isToggling?: boolean; // UI-only state to indicate if we're currently toggling completion status
};

type Company = { id: number; name: string };
type TimeFrameTag = "six-months" | "three-months" | "thirty-days";

/* ─────────────────────────────────────────────────────────── */
/* Constants */
/* ─────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────── */
/* Helpers */
/* ─────────────────────────────────────────────────────────── */
async function fetchAllCompanyProblems(companyId: number) {
  const PAGE_SIZE = 4000;
  let from = 0;
  const allRows: any[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("company_problems")
      .select(
        `
        timeframe_tag,
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
      .eq("company_id", companyId)
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
}

/* ─────────────────────────────────────────────────────────── */
/* Cell Renderers */
/* ─────────────────────────────────────────────────────────── */
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
      alert("Please sign in to mark problems as completed.");
      return;
    }

    const userId = session.user.id;
    const problemId = data.id;
    const newCompleted = !value;

    // Show loader immediately
    const loadingRow = { ...data, isToggling: true };

    api.applyTransaction({
      update: [loadingRow],
    });

    // 👇 FORCE CELL REFRESH
    api.refreshCells({
      rowNodes: [props.node],
      force: true,
    });
    try {
      if (newCompleted) {
        const { error } = await supabase
          .from("user_completed_problems")
          .insert({
            user_id: userId,
            problem_id: problemId,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_completed_problems")
          .delete()
          .eq("user_id", userId)
          .eq("problem_id", problemId);

        if (error) throw error;
      }

      // Success → update completed state
      api.applyTransaction({
        update: [
          {
            ...data,
            completed: newCompleted,
            isToggling: false,
          },
        ],
      });
    } catch (err) {
      console.error("Toggle failed:", err);

      // Rollback + remove loader
      api.applyTransaction({
        update: [
          {
            ...data,
            completed: value,
            isToggling: false,
          },
        ],
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
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_STYLES[value] ?? "text-muted-foreground"}`}
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
  if (value == null) {
    return (
      <div className="text-muted-foreground flex h-full items-center text-xs">
        —
      </div>
    );
  }
  return (
    <div className="flex h-full items-center gap-1.5">
      <div className="bg-muted h-1.5 w-14 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-muted-foreground text-xs tabular-nums">
        {value.toFixed(2)}%
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
            className="text-muted-foreground text-md"
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
    <div className="gap-y-0. flex h-full flex-wrap items-center gap-x-1">
      {value.slice(0, 3).map((tag) => (
        <Badge
          variant={"secondary"}
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

function OtherCompaniesTooltip({ value }: ITooltipParams<Problem, string[]>) {
  if (!value || value.length === 0) return null;

  return (
    <div className="bg-background rounded-md border p-2 shadow-lg">
      <div className="flex max-w-xs flex-wrap gap-1">
        {value.map((name) => (
          <Badge
            key={name}
            variant="outline"
            className={cn(
              "text-muted-foreground text-md",
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

function OtherCompaniesCellRenderer({
  value,
}: ICellRendererParams<Problem, string[]>) {
  if (!value || value.length === 0) return null;
  return (
    <div className="flex h-full flex-wrap items-center gap-x-0.5 gap-y-0">
      {value.slice(0, 3).map((name) => (
        <Badge
          variant={"outline"}
          key={name}
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

/* ─────────────────────────────────────────────────────────── */
/* Main Component */
/* ─────────────────────────────────────────────────────────── */
export default function CompanyProblems() {
  const { theme } = useAppContext();
  const { id } = useParams<{ id: string }>();
  const companyId = Number(id);

  const [company, setCompany] = useState<Company | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState<Difficulty | "All">("All");

  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<"AND" | "OR">("AND");

  const gridRef = useRef<AgGridReact<Problem>>(null);

  /* ─── Fetch ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!companyId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      const { data: companyData, error: companyErr } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", companyId)
        .single();

      if (companyErr || !companyData) {
        setError("Company not found.");
        setLoading(false);
        return;
      }

      setCompany(companyData);

      const data = await fetchAllCompanyProblems(companyId);
      console.log("Fetched problems:", data);

      if (!data) {
        setError("Failed to fetch problems.");
        setLoading(false);
        return;
      }

      let assembled: Problem[] = data.map((row: any) => {
        const p = row.problem;
        return {
          id: p.id,
          title: p.title ?? "Untitled",
          url: p.url ?? null,
          difficulty: p.difficulty ?? null,
          acceptance: p.acceptance ?? null,
          frequency: p.frequency ?? null,
          tags: p.problem_tags?.map((t: any) => t.tag) ?? [],
          other_companies:
            p.company_problems
              ?.map((cp: any) => cp.company?.name)
              .filter((name: string) => name && name !== companyData.name) ??
            [],
          completed: false,
          timeframe_tag: row.timeframe_tag ?? null,
          isToggling: false,
        };
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: completedRows } = await supabase
          .from("user_completed_problems")
          .select("problem_id")
          .eq("user_id", session.user.id);

        const completedSet = new Set(completedRows?.map((r) => r.problem_id));
        assembled = assembled.map((p) => ({
          ...p,
          completed: completedSet.has(p.id),
        }));
      }

      setProblems(assembled);
      setLoading(false);
    }

    fetchData();
  }, [companyId]);

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

  /* ─── Quick filter (search + difficulty) ────────────────── */
  useEffect(() => {
    if (!gridRef.current?.api) return;

    // AG Grid external filter handles difficulty; quick filter handles search
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

      // Difficulty filter
      if (diffFilter !== "All" && problem.difficulty !== diffFilter) {
        return false;
      }

      // Tag filter
      if (selectedTags.length > 0) {
        const problemTags = problem.tags ?? [];

        if (tagMatchMode === "AND") {
          const matchesAll = selectedTags.every((tag) =>
            problemTags.includes(tag),
          );
          if (!matchesAll) return false;
        } else {
          const matchesAny = selectedTags.some((tag) =>
            problemTags.includes(tag),
          );
          if (!matchesAny) return false;
        }
      }

      return true;
    },
    [diffFilter, selectedTags, tagMatchMode],
  );

  /* ─── Column Definitions ────────────────────────────────── */
  const columnDefs = useMemo<ColDef<Problem>[]>(
    () => [
      {
        field: "completed",
        headerName: "",
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
        sort: null,
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
        field: "timeframe_tag",
        headerName: "<Time",
        headerTooltip:
          "Indicates how recently this problem was asked at this company — within the last 30 days, 3 months, or 6 months",
        width: 60,
        cellRenderer: ({ value }: ICellRendererParams) => {
          const map: Record<TimeFrameTag, { label: string; style: string }> = {
            "six-months": {
              label: "6M",
              style: "text-blue-400 bg-blue-400/10",
            },
            "three-months": {
              label: "3M",
              style: "text-violet-400 bg-violet-400/10",
            },
            "thirty-days": {
              label: "30D",
              style: "text-orange-400 bg-orange-400/10",
            },
          };
          const entry = map[value as TimeFrameTag];
          if (!entry)
            return <span className="text-muted-foreground text-xs"></span>;
          return (
            <div className="flex h-full items-center">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${entry.style}`}
              >
                {entry.label}
              </span>
            </div>
          );
        },
        comparator: (a: TimeFrameTag, b: TimeFrameTag) => {
          const order: Record<TimeFrameTag, number> = {
            "thirty-days": 0,
            "three-months": 1,
            "six-months": 2,
          };
          return (order[a] ?? 99) - (order[b] ?? 99);
        },
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
        width: 120,
        cellRenderer: AcceptanceCellRenderer,
        comparator: (a, b) => (a ?? -1) - (b ?? -1),
      },
      {
        field: "frequency",
        headerName: "Frequency",
        headerTooltip: "How frequently this problem is asked at this company.",
        width: 130,
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

        // tooltip:
        tooltipComponent: TagsTooltip,
        tooltipValueGetter: (params) => params.value,
      },
      {
        field: "other_companies",
        headerName: "Also Asked At",
        flex: 1.5,
        minWidth: 150,
        filter: false,
        cellRenderer: OtherCompaniesCellRenderer,
        // sort by number of other companies
        comparator: (a, b) => (b?.length ?? 0) - (a?.length ?? 0),

        // tooltip:
        tooltipComponent: OtherCompaniesTooltip,
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

  /* ─── Stats ─────────────────────────────────────────────── */
  const easyCnt = problems.filter((p) => p.difficulty === "Easy").length;
  const medCnt = problems.filter((p) => p.difficulty === "Medium").length;
  const hardCnt = problems.filter((p) => p.difficulty === "Hard").length;
  const completedCnt = problems.filter((p) => p.completed).length;

  /* ─── Render ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="border-primary h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" />
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
            <div>
              <p className="text-muted-foreground flex items-center gap-1 text-xs tracking-wide">
                <Building2 className="text-muted-foreground mr-1 mb-1 inline h-4 w-4" />
                Company
              </p>
              <h1 className="text-3xl font-semibold capitalize">
                {company?.name}
              </h1>
            </div>
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
                {problems.length} problems · {completedCnt} completed
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

      {/* AG Grid */}
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
                .withParams({
                  cellFontFamily: "geist, sans-serif",
                })
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
                        rowHoverColor: "#151515", // charcoal-700
                        backgroundColor: "#0a0a0a",
                        foregroundColor: "#bfbfbf", // charcoal-100
                        browserColorScheme: "dark", // to change scrollbar color
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
    </div>
  );
}
