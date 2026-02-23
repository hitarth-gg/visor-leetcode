import { Code, Database, Globe, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import okeyFrieren from "~/assets/okey-frieren.png";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { supabase } from "~/supabase/supabaseClient";

const CACHE_KEY = "home_stats_cache";
const CACHE_DURATION = 1000 * 60 * 15; // 15 min

let memoryCache: { companies: number; problems: number } | null = null;

export default function Home() {
  const [stats, setStats] = useState<{
    companies: number;
    problems: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<boolean>(false);

  /* --------------------- FETCH STATS -------------------- */
  useEffect(() => {
    async function fetchStats() {
      // 1️⃣ Memory cache
      if (memoryCache) {
        setStats(memoryCache);
        setLoading(false);
        return;
      }

      // 2️⃣ LocalStorage cache
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          memoryCache = parsed.data;
          setStats(parsed.data);
          setLoading(false);
          return;
        }
      }

      // 3️⃣ Fetch counts from Supabase
      const [companiesRes, problemsRes] = await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }),

        supabase.from("problems").select("*", { count: "exact", head: true }),
      ]);

      const data = {
        companies: companiesRes.count ?? 0,
        problems: problemsRes.count ?? 0,
      };

      memoryCache = data;

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );

      setStats(data);
      setLoading(false);
    }
    fetchStats();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(!!session);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <main className="flex h-screen flex-col items-center">
      <div className="flex w-full flex-col items-center gap-4 px-6 py-16">
        <div className="font-geist text-primary relative flex flex-col items-start text-3xl font-semibold sm:text-4xl md:text-5xl dark:drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
          <span>Company-Wise</span>
          <span>
            <span className="">
              <span className="bg-linear-to-b from-[#ffa116] via-[#ff9345] to-[#ff3d00] bg-clip-text text-transparent dark:drop-shadow-[0_4px_25px_rgba(255,100,0,0.6)]">
                Leetcode{" "}
              </span>
              <img
                src={okeyFrieren}
                alt="Okey Frieren"
                className="absolute right-0 bottom-8 -z-10 w-12 rotate-12 rounded-md sm:right-0 sm:bottom-9 sm:w-14 md:right-5 md:bottom-10 md:w-16 dark:brightness-[1] dark:drop-shadow-[0_4px_40px_rgba(255,255,255,0.3)]"
              />
            </span>
            <span className="dark:drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">
              Problems
            </span>
          </span>
        </div>
      </div>

      <div className="font-geist flex w-fit flex-col items-center px-6 py-8">
        <div className="mx-auto flex w-fit items-center gap-4 font-mono">
          <Link
            to="https://github.com/snehasishroy/leetcode-companywise-interview-questions"
            target="_blank"
          >
            <Button
              size={"lg"}
              className="bg-muted/50 mt-4 cursor-pointer text-lg font-normal shadow-none"
              variant={"outline"}
            >
              <Database />
              Database
            </Button>
          </Link>

          <Link
            to="https://github.com/hitarth-gg/visor-leetcode"
            target="_blank"
          >
            <Button
              size={"lg"}
              className="bg-muted/50 mt-4 cursor-pointer text-lg font-normal shadow-none"
              variant={"outline"}
            >
              <Globe />
              Website
            </Button>
          </Link>
        </div>

        <Link
          to={session ? "/all-problems" : "/sign-in?next=/all-problems"}
          className="w-full"
        >
          {!session ? (
            <Button
              size={"lg"}
              className="font-space-grotesk mt-4 w-full cursor-pointer text-lg shadow-none"
              variant={"default"}
            >
              <User strokeWidth={3} />
              Sign in to save progress
            </Button>
          ) : (
            <Button
              size={"lg"}
              className="font-space-grotesk mt-4 w-full cursor-pointer text-lg shadow-none"
              variant={"default"}
            >
              Start Solving <Code strokeWidth={3} />
            </Button>
          )}
        </Link>
      </div>
      <div className="w-full">
        {/* ───────── Stats Section ───────── */}
        <div className="mt-auto w-full py-8">
          <div className="mx-auto flex max-w-4xl justify-center gap-16 text-center">
            {loading ? (
              <div className="text-muted-foreground text-sm">
                <Spinner />
              </div>
            ) : (
              <>
                <div className="flex flex-row items-center gap-2">
                  <div className="text-xl font-medium tracking-tight tabular-nums">
                    {stats?.companies.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-sm">Companies</div>
                </div>

                <div className="flex flex-row items-center gap-2">
                  <div className="text-xl font-semibold tabular-nums">
                    {stats?.problems.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-sm">Problems</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
