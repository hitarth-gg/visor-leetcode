import { useState } from "react";
import { Button } from "~/components/ui/button";
import { supabase } from "~/supabase/supabaseClient";

export default function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="bg-background text-primary font-geist flex min-h-full w-full flex-col items-center gap-4">
      <div className="flex w-96 flex-col items-center gap-2 px-6 py-16">
        <div className="flex w-full flex-col items-start justify-start">
          <div className="text-primary text-3xl">Welcome</div>
          <div className="text-muted-foreground text-sm">
            Sign in or create an account to store your progress.
          </div>
        </div>

        <div className="mt-6 flex w-full flex-col items-start gap-4">
          <Button
            variant={"outline"}
            size={"lg"}
            className="bg-muted/40 text-md flex w-full cursor-pointer items-center justify-center gap-4 shadow-none"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <img
              src="https://img.icons8.com/?size=192&id=V5cGWnc9R4xj&format=png"
              className="h-5 w-5"
              alt="Google"
            />
            <span>Continue with Google</span>
          </Button>
        </div>

        <div className="text-muted-foreground mt-2 w-full text-center text-xs">
          No email based sign in yet, because the DB runs on Supabase Free tier
          with email based verification limits.
        </div>
      </div>
    </div>
  );
}
