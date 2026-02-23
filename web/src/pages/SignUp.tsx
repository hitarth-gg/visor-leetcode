import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { supabase } from "~/supabase/supabaseClient";

export default function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      navigate("/verify-email");
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  const isValid =
    name.trim() !== "" &&
    email.trim() !== "" &&
    password.length >= 8 &&
    confirmPassword === password;

  return (
    <div className="bg-background text-primary font-geist flex min-h-full w-full flex-col items-center gap-4">
      <div className="flex w-96 flex-col items-center gap-2 px-6 py-16">
        <div className="flex w-full flex-col items-start justify-start">
          <div className="text-primary text-3xl">Create an account</div>
          <div className="text-muted-foreground">Sign up to get started</div>
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

        <div className="my-3 flex w-full items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-sm">or</span>
          <Separator className="flex-1" />
        </div>

        <div className="flex w-full items-center gap-2">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="Jane Doe"
                className="bg-muted/20 shadow-none"
                onChange={(e) => setName(e.target.value)}
                value={name}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="bg-muted/20 shadow-none"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <ButtonGroup className="ml-auto">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="bg-muted/20 shadow-none"
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                />
                <Button
                  type="button"
                  variant={"outline"}
                  size={"icon"}
                  className="bg-muted/20 shadow-none"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {!showPassword ? <Eye /> : <EyeOff />}
                </Button>
              </ButtonGroup>
              {password.length > 0 && password.length < 8 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Must be at least 8 characters
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <ButtonGroup className="ml-auto">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="bg-muted/20 shadow-none"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  value={confirmPassword}
                />
                <Button
                  type="button"
                  variant={"outline"}
                  size={"icon"}
                  className="bg-muted/20 shadow-none"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {!showConfirmPassword ? <Eye /> : <EyeOff />}
                </Button>
              </ButtonGroup>
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-destructive mt-1 text-xs">
                  Passwords do not match
                </p>
              )}

              {error && (
                <p className="text-destructive mt-1 text-sm">{error}</p>
              )}

              <Button
                variant={"default"}
                className="mt-6 w-full cursor-pointer"
                onClick={handleSignUp}
                disabled={loading || !isValid}
              >
                {loading ? "Creating account…" : "Create Account"}
              </Button>

              <div className="text-muted-foreground mt-2 w-full text-center text-sm">
                Already have an account?{" "}
                <Link
                  to={"/sign-in"}
                  className="text-primary underline underline-offset-2"
                >
                  Sign in
                </Link>
              </div>
            </Field>
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}
