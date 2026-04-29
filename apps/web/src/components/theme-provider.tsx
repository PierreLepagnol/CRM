"use client";

import {
  ThemeProvider as NextThemesProvider,
  useTheme,
  type ThemeProviderProps,
} from "next-themes";

function ThemeProvider(props: ThemeProviderProps) {
  return <NextThemesProvider attribute="class" {...props} />;
}

export { ThemeProvider, useTheme };
