import { useSyncExternalStore, type ReactNode } from "react";
import { App, ConfigProvider, theme, type ThemeConfig } from "antd";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the system asks for a dark theme, following it when it changes. */
export function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(DARK_QUERY).matches, () => false);
}

const light: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: { colorPrimary: "#0071e3", colorText: "#1d1d1f", colorBgLayout: "#f5f5f7", colorBorder: "#d2d2d7" },
};

const dark: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: { colorPrimary: "#0a84ff", colorBgLayout: "#000000", colorBgContainer: "#1c1c1e", colorBgElevated: "#2c2c2e" },
};

/** antd's theme, light or dark as the system prefers; its tokens are CSS variables (`--ant-*`) below it. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider theme={usePrefersDark() ? dark : light}>{children}</ConfigProvider>;
}

/** The theme around the whole app: antd's App element carries the variables to the app's own CSS. */
export function AppTheme({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <App className="app-theme">{children}</App>
    </ThemeProvider>
  );
}
