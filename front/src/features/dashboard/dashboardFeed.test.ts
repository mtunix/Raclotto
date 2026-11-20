import { events, stats } from "../../lib/api/__fixtures__/backendResponses";
import { feedItems } from "./dashboardFeed";

const at = (minute: number) => `2026-12-24T19:${String(minute).padStart(2, "0")}:00`;

it("merges pans and events newest first", () => {
  const [pan] = stats.pans;
  const [event] = events;

  const items = feedItems(
    [
      { ...pan, id: 1, timestamp: at(10) },
      { ...pan, id: 2, timestamp: at(30) },
    ],
    [{ ...event, id: 7, created_at: at(20) }],
  );

  expect(items.map((item) => item.key)).toEqual(["pan-2", "event-7", "pan-1"]);
});

it("puts the event a pan caused above the pan when both have the same time", () => {
  const [pan] = stats.pans;
  const [event] = events;

  const items = feedItems([{ ...pan, id: 1, timestamp: at(10) }], [{ ...event, id: 7, created_at: at(10) }]);

  expect(items.map((item) => item.kind)).toEqual(["event", "pan"]);
});
