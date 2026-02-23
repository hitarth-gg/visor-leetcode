import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { supabase } from "~/supabase/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      const next = searchParams.get("next") ?? "/";
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Supabase sometimes surfaces errors in the URL (e.g. expired link)
      if (error) {
        console.error("Auth callback error:", errorDescription ?? error);
        navigate(
          `/sign-in?error=${encodeURIComponent(errorDescription ?? error)}`,
        );
        return;
      }

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("Code exchange error:", exchangeError.message);
          navigate(
            `/sign-in?error=${encodeURIComponent(exchangeError.message)}`,
          );
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/sign-in");
        return;
      }

      navigate(next);
    }

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="bg-background font-geist flex min-h-full w-full flex-col items-center justify-center gap-3">
      <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  );
}
