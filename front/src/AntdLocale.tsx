import type { ReactNode } from "react";
import { ConfigProvider } from "antd";
import deDE from "antd/locale/de_DE";
import enUS from "antd/locale/en_US";
import { useLanguage } from "./lib/language";

/** antd's own texts ("No data", OK and Cancel, form messages) in the language the UI speaks. */
export function AntdLocale({ children }: { children: ReactNode }) {
  const language = useLanguage();
  return <ConfigProvider locale={language?.startsWith("de") ? deDE : enUS}>{children}</ConfigProvider>;
}
