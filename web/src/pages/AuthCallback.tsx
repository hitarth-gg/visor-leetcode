import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "~/supabase/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      // Let Supabase parse the URL (hash or code automatically)
      const { data, error } = await supabase.auth.getSession();
  
      if (error) {
        navigate(`/sign-in?error=${encodeURIComponent(error.message)}`);
        return;
      }
  
      if (!data.session) {
        navigate("/sign-in");
        return;
      }
  
      navigate("/");
    }
  
    handleCallback();
  }, [navigate]);

  return (
    <div className="bg-background font-geist flex min-h-full w-full flex-col items-center justify-center gap-3">
      <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  );
}
