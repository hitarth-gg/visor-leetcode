import { useCallback, useState } from "react";
import { AppContext } from "./AppContext";
import type { Theme } from "~/types/shared";

export function ContextProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    document.body.classList.toggle("dark", storedTheme === "dark");
    return storedTheme ?? "light";
  });
  const [otherState, setOtherState] = useState<number>(0);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    document.body.classList.toggle("dark", newTheme === "dark");
  }, []);

  const api = {
    theme,
    setTheme,
    otherState,
    setOtherState,
  };

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}
