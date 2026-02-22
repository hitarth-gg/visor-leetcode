import { createContext } from "react";
import type { Theme } from "~/types/shared";

type ProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

export const AppContext = createContext<ProviderState>({
  theme: "dark",
  setTheme: () => {},
});
