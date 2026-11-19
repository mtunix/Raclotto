import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import {
  getGetLevelKey,
  getLevel,
  listLevels,
  useListLevels,
} from "../../api/generated/endpoints/levels/levels";
import type { LevelDto } from "../../api/generated/model";
import { FakeTransport } from "./fakeTransport";
import { setTransport, type Transport } from "./transport";

const levels: LevelDto[] = [
  { id: 1, name: "level.novice", label_en: "Novice", label_de: "Neuling", required_experience: 0 },
  { id: 2, name: "level.cook", label_en: "Cook", label_de: "Koch", required_experience: 100 },
];

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
  fake = new FakeTransport();
  previous = setTransport(fake);
});

afterEach(() => {
  setTransport(previous);
});

function freshCache({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>;
}

describe("generated client through the transport", () => {
  it("lists levels as plain DTOs", async () => {
    fake.on("GET", "/levels", levels);

    const result: LevelDto[] = await listLevels();

    expect(result).toEqual(levels);
    expect(fake.requests).toEqual([
      { method: "GET", path: "/levels", query: undefined, body: undefined },
    ]);
  });

  it("puts path parameters into the path", async () => {
    fake.on("GET", "/levels/2", levels[1]);

    const level: LevelDto = await getLevel(2);

    expect(level.label_en).toBe("Cook");
    expect(getGetLevelKey(2)).toEqual(["/levels/2"]);
  });

  it("rejects when the transport fails", async () => {
    await expect(getLevel(9)).rejects.toThrow("no response registered for GET /levels/9");
  });

  it("serves the SWR hook from the transport", async () => {
    fake.on("GET", "/levels", levels);

    const { result } = renderHook(() => useListLevels(), { wrapper: freshCache });

    await waitFor(() => expect(result.current.data).toEqual(levels));
    expect(fake.last("GET", "/levels")).toBeDefined();
  });
});
