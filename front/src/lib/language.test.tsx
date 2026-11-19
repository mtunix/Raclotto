import { act, render, screen } from "@testing-library/react";
import { Empty } from "antd";
import i18n from "../i18n";
import { AntdLocale } from "../AntdLocale";
import { formatDate, formatDateTime, formatNumber, formatRating, numberFormatter, useLanguage } from "./language";

beforeEach(async () => {
  await i18n.changeLanguage("de");
});

it("writes a day the way the language does", () => {
  expect(formatDate("2026-11-19T12:00:00Z", "de")).toBe("19.11.2026");
  expect(formatDate("2026-11-19T12:00:00Z", "en")).toBe("11/19/2026");
  expect(formatDateTime("2026-11-19T12:00:00Z", "de")).toMatch(/^19\.11\.2026, \d\d:00:00$/);
});

it("writes a number the way the language does", () => {
  expect(formatNumber(13200, "de")).toBe("13.200");
  expect(formatNumber(13200, "en")).toBe("13,200");
  expect(formatRating(4.5, "de")).toBe("4,5");
  expect(formatRating(4, "en")).toBe("4.0");
  expect(formatNumber(0.5, "de", { style: "percent" })).toBe("50 %");
  expect(numberFormatter("de", { minimumFractionDigits: 2 })(3.75)).toBe("3,75");
});

it("leaves a value that is no date as it is", () => {
  expect(formatDate("soon", "de")).toBe("soon");
  expect(formatDateTime("soon", "de")).toBe("soon");
});

function Today() {
  return <p>{formatDate("2026-11-19T12:00:00Z", useLanguage())}</p>;
}

it("re-renders dates and antd's texts when the language switches", async () => {
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
