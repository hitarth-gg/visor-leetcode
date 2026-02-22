import { House, Logs, Menu, Moon, Sun, SunMoon, X } from "lucide-react";
import { Link } from "react-router";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "~/components/ui/navigation-menu";
import { Input } from "./ui/input";
import { Field } from "./ui/field";
import { useAppContext } from "~/context/useAppContext";
import { Button } from "./ui/button";
import { cn } from "~/lib/utils";
import { useState } from "react";

export default function Navbar() {
  return (
    <div className="bg-background font-geist sticky top-0 z-50 flex h-(--header-height) w-full">
      <div className="flex w-full items-center justify-between px-6">
        <div className="hidden h-full items-center justify-between md:flex">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigateLink title="" icon={<House size={20} />} path="/" />
              <NavigateDropdown />
              <NavigateLink title="Docs" path="/docs" />
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <MobileNav />

        <div className="flex h-full items-center justify-between gap-4">
          <ToggleTheme />
          <SearchBar />
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
        <div>Mobile Navigation goes here</div>
      </div>
    </>
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

function SearchBar() {
  return (
    <div className="relative">
      <Field>
        <Input
          placeholder="Search a company..."
          className="bg-input/30 h-8 rounded-sm shadow-none"
        />
      </Field>
    </div>
  );
}

function ToggleTheme() {
  const { setTheme, theme } = useAppContext();
  return (
    <Button
      variant={"ghost"}
      size={"icon"}
      className="h-8 w-8 p-0"
      onClick={() => {
        setTheme(theme === "light" ? "dark" : "light");
      }}
    >
      {/* <SunMoon className="text-foreground" /> */}
      {theme === "light" ? <Sun /> : <Moon />}
    </Button>
  );
}
