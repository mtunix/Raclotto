import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useAppStore } from "../../../AppSlice";
import { useAuthStore } from "../../../AuthSlice";
import {
  ingredientOfTheHour,
  session,
  sessionRecap,
  stats,
} from "../../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../../lib/api/fakeTransport";
import { setTransport, type Transport } from "../../../lib/api/transport";
import { displayName } from "../../../shared/displayName";
import { Dashboard } from "./Dashboard";

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
  fake = new FakeTransport()
    .on("GET", "/stats", stats)
    .on("GET", "/sessions/recap", sessionRecap)
    .on("GET", "/events/ingredient-of-the-hour", ingredientOfTheHour);
  previous = setTransport(fake);
  useAppStore.setState({ session });
  useAuthStore.setState({ user: null });
});

afterEach(() => {
  setTransport(previous);
});

function renderDashboard() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <Dashboard />
    </SWRConfig>,
  );
}

const statsQueries = () => fake.requests.filter((r) => r.path === "/stats").map((r) => r.query);
const shown = (name: string | null) => displayName(name, (key) => key);
const feed = () => document.querySelector(".dashboard-feed") as HTMLElement;

describe("the session's live view", () => {
  it("is where it starts, with the session's stats and recap", async () => {
    renderDashboard();

    await waitFor(() => expect(statsQueries()[0]).toEqual({ session_key: session.key }));
    expect(fake.last("GET", "/sessions/recap")?.query).toEqual({ session_key: session.key });
  });

  it("feeds the newest pans and the session's events", async () => {
    const [newest, older] = stats.pans;
    renderDashboard();

    await waitFor(() => expect(screen.getByText(shown(newest.name))).toBeInTheDocument());
    expect(screen.getByText(shown(older.name))).toBeInTheDocument();
    expect(within(feed()).getAllByText(/dashboard\.rolled/)).toHaveLength(stats.pans.length);
    expect(within(feed()).getByText(/events\.types\.pan_swap\.message/)).toBeInTheDocument();
    expect(within(feed()).getByText(/events\.types\.ingredient_of_the_hour\.message/)).toBeInTheDocument();
  });

  it("ranks tonight's participants by their XP", async () => {
    renderDashboard();

    const standings = (await screen.findByText("dashboard.tonight")).closest(".dashboard-card") as HTMLElement;
    for (const participant of sessionRecap.participants) {
      expect(within(standings).getByText(participant.user.name)).toBeInTheDocument();
      expect(within(standings).getByText(`${participant.xp} XP`)).toBeInTheDocument();
    }
    expect(within(standings).getByText("🥇")).toBeInTheDocument();
  });

  it("shows how to join and the ingredient of the hour", async () => {
    renderDashboard();

    expect(await screen.findByText(`${window.location.origin}/join/${session.join_code}`)).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector(".ingredient-of-the-hour")).not.toBeNull());
    const card = document.querySelector(".ingredient-of-the-hour") as HTMLElement;
    expect(within(card).getByText(shown(ingredientOfTheHour.ingredient?.name ?? null))).toBeInTheDocument();
  });

  it("marks a pan rolled with the ingredient of the hour", async () => {
    const [newest, ...rest] = stats.pans;
    fake.on("GET", "/stats", { ...stats, pans: [{ ...newest, ingredient_of_the_hour: true }, ...rest] });
    renderDashboard();

    await waitFor(() => expect(screen.getByText(shown(newest.name))).toBeInTheDocument());
    expect(within(feed()).getByText("ingredientOfTheHour.title")).toBeInTheDocument();
  });
});

describe("all sessions", () => {
  it("asks for every session's stats and shows the global leaderboard", async () => {
    renderDashboard();
    await screen.findByText("dashboard.tonight");

    fireEvent.click(screen.getByText("dashboard.global"));

    await waitFor(() => expect(statsQueries()).toContainEqual(undefined));
    for (const entry of stats.leaderboard) {
      expect(await screen.findByText(entry.name)).toBeInTheDocument();
      expect(screen.getByText(String(entry.total_points))).toBeInTheDocument();
    }
    expect(screen.queryByText("dashboard.tonight")).not.toBeInTheDocument();
    expect(screen.queryByText(/events\.types\.pan_swap\.message/)).not.toBeInTheDocument();
  });
});

it("pans and ingredients the old API left without a name show as unnamed", async () => {
  const [newest, ...rest] = stats.pans;
  const [mostUsed, ...used] = stats.ingredients_most_used;
  const [topRated, ...rated] = stats.ingredients_top_rated;
  fake.on("GET", "/stats", {
    ...stats,
    pans: [{ ...newest, name: null }, ...rest],
    ingredients_most_used: [{ ...mostUsed, ingredient: { ...mostUsed.ingredient, name: null } }, ...used],
    ingredients_top_rated: [{ ...topRated, ingredient: { ...topRated.ingredient, name: null } }, ...rated],
  });
  renderDashboard();

  await waitFor(() => expect(screen.getAllByText("common.unnamed").length).toBeGreaterThanOrEqual(2));
  fireEvent.click(screen.getByText("dashboard.usage"));
  await waitFor(() => expect(screen.getAllByText("common.unnamed").length).toBeGreaterThanOrEqual(3));
});
