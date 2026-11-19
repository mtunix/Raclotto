import { act, render, screen } from "@testing-library/react";
import { Empty } from "antd";
import i18n from "../i18n";
import { AntdLocale } from "../AntdLocale";
import { formatDate, formatDateTime, useLanguage } from "./language";

afterEach(async () => {
  await i18n.changeLanguage("de");
});

it("writes a day the way the language does", () => {
  expect(formatDate("2026-11-19T12:00:00Z", "de")).toBe("19.11.2026");
  expect(formatDate("2026-11-19T12:00:00Z", "en")).toBe("11/19/2026");
  expect(formatDateTime("2026-11-19T12:00:00Z", "de")).toMatch(/^19\.11\.2026, \d\d:00:00$/);
});

it("leaves a value that is no date as it is", () => {
  expect(formatDate("soon", "de")).toBe("soon");
  expect(formatDateTime("soon", "de")).toBe("soon");
});

function Today() {
  return <p>{formatDate("2026-11-19T12:00:00Z", useLanguage())}</p>;
}

it("re-renders dates and antd's texts when the language switches", async () => {
  await i18n.changeLanguage("de");
  render(
    <AntdLocale>
      <Today />
      <Empty />
    </AntdLocale>,
  );
  expect(screen.getByText("19.11.2026")).toBeInTheDocument();
  expect(screen.getByText("Keine Daten", { selector: ".ant-empty-description" })).toBeInTheDocument();

  await act(() => i18n.changeLanguage("en"));

  expect(screen.getByText("11/19/2026")).toBeInTheDocument();
  expect(screen.getByText("No data", { selector: ".ant-empty-description" })).toBeInTheDocument();
});
