import { House, LogOut, Menu, Moon, Sun, User, X } from "lucide-react";
import { Link, useNavigate } from "react-router";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "~/components/ui/navigation-menu";
import { useAppContext } from "~/context/useAppContext";
import { Button } from "./ui/button";
import { cn } from "~/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "~/supabase/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Spinner } from "./ui/spinner";
import SearchCompany from "./SearchCompany";
import okeyFrieren from "~/assets/okey-frieren.png";
import GithubSvg from "~/assets/githubSvg";

export default function Navbar() {
  return (
    <div className="bg-background font-geist sticky top-0 z-50 flex h-(--header-height) w-full">
      <div className="flex w-full items-center justify-between px-6">
        <div className="hidden h-full items-center justify-between md:flex">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigateLink title="" icon={<House size={20} />} path="/" />
              <NavigateLink title="All Problems" path="/all-problems" />
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <MobileNav />

        <div className="flex h-full items-center justify-between gap-4">
          <Link
            to="https://github.com/hitarth-gg/visor-leetcode"
            target="_blank"
          >
            <Button
              variant={"ghost"}
              size={"icon"}
              className="h-8 cursor-pointer"
            >
             <GithubSvg />
            </Button>
          </Link>
          <ToggleTheme />
          <SearchCompany />
          <AuthButton />
        </div>
      </div>
    </div>
  );
}

function MobileNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="flex md:hidden">
        <Button
          variant={"ghost"}
          size={"icon"}
          className="h-8 w-8 p-0 [&>svg]:size-5"
          onClick={() => {
            setMenuOpen((prev) => {
              const next = !prev;
              document.body.style.overflow = next ? "hidden" : "";
              return next;
            });
          }}
        >
          {!menuOpen ? <Menu /> : <X />}
        </Button>
      </div>

      <div
        aria-hidden={!menuOpen}
        className={cn(
          "bg-background/80 fixed inset-x-0 bottom-0 z-40 backdrop-blur-sm",
          "transition-[opacity,transform] duration-200 ease-out",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ top: "var(--header-height)" }}
        onClick={() => {
          setMenuOpen(false);
          document.body.style.overflow = "";
        }}
      >
        <nav className="flex flex-col gap-2 p-4">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            onClick={() => {
              setMenuOpen(false);
              document.body.style.overflow = "";
            }}
          >
            <House size={18} />
            Home
          </Link>
          <Link
            to="/all-problems"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            onClick={() => {
              setMenuOpen(false);
              document.body.style.overflow = "";
            }}
          >
            All Problems
          </Link>
        </nav>
      </div>
    </>
  );
}

export function AuthButton() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    // Keep in sync on tab focus, sign in/out events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setSession(session);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/sign-in");
  }

  if (session) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={"outline"}
            size={"icon"}
            className="h-8 cursor-pointer px-3 shadow-none"
            onClick={async () => {
              setIsSigningOut(true);
              try {
                await handleSignOut();
              } finally {
                setIsSigningOut(false);
              }
            }}
            disabled={isSigningOut}
          >
            {isSigningOut ? <Spinner /> : <LogOut />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Sign out</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link to="/sign-in">
      <Button variant={"default"} className="h-8 cursor-pointer px-3">
        <User />
        <p>Sign In</p>
      </Button>
    </Link>
  );
}

function NavigateLink({
  title,
  path,
  icon,
}: {
  title: string;
  path: string;
  icon?: React.ReactNode;
}) {
  return (
    <NavigationMenuItem className="">
      <NavigationMenuLink
        asChild
        className={cn(
          navigationMenuTriggerStyle(),
          "h-8 gap-1.5 px-2.5 text-sm",
          !title && "p-2",
        )}
      >
        <Link className="" to={path}>
          {title || icon}
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

function NavigateDropdown() {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="h-8 gap-1.5 px-2.5 text-sm">
        Components
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <NavigationMenuLink className="p-4">Link</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function ToggleTheme() {
  const { setTheme, theme } = useAppContext();
  return (
    <Button
      variant={"ghost"}
      size={"icon"}
      className="h-8 w-8 cursor-pointer p-0"
      onClick={() => {
        setTheme(theme === "light" ? "dark" : "light");
      }}
    >
      {/* <SunMoon className="text-foreground" /> */}
      {theme === "light" ? <Sun /> : <Moon />}
    </Button>
  );
}
