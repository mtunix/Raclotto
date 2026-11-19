import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useAppStore } from "../../../AppSlice";
import { useAuthStore } from "../../../AuthSlice";
import { session, stats } from "../../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../../lib/api/fakeTransport";
import { setTransport, type Transport } from "../../../lib/api/transport";
import { displayName } from "../../../shared/displayName";
import { Dashboard } from "./Dashboard";

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
  fake = new FakeTransport().on("GET", "/stats", stats);
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

it("starts with the stats of every session", async () => {
  renderDashboard();

  await waitFor(() => expect(screen.getByText("Cleo")).toBeInTheDocument());
  expect(statsQueries()[0]).toBeUndefined();
});

it("shows the newest pans with their authors, the ingredients and the leaderboard", async () => {
  const [newest, older] = stats.pans;
  renderDashboard();

  await waitFor(() => expect(screen.getByText(shown(newest.name))).toBeInTheDocument());
  expect(screen.getByText(shown(older.name))).toBeInTheDocument();
  expect(screen.getByText(`history.consumedBy ${newest.author?.name}`)).toBeInTheDocument();
  expect(screen.getByText(`history.consumedBy ${older.author?.name}`)).toBeInTheDocument();
  for (const entry of stats.leaderboard) {
    expect(screen.getByText(entry.name)).toBeInTheDocument();
    expect(screen.getByText(String(entry.total_points))).toBeInTheDocument();
  }
  const [mostUsed] = stats.ingredients_most_used;
  expect(mostUsed.pan_count).toBe(2);
  expect(screen.getAllByText(String(mostUsed.pan_count)).length).toBeGreaterThan(0);
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

  await waitFor(() => expect(screen.getByText(`history.consumedBy ${newest.author?.name}`)).toBeInTheDocument());
  expect(screen.getAllByText("common.unnamed")).toHaveLength(3);
});

it("switching to the session asks for the session's stats", async () => {
  renderDashboard();
  await waitFor(() => expect(screen.getByText("Cleo")).toBeInTheDocument());

  fireEvent.click(screen.getByText("dashboard.global"));

  await waitFor(() => expect(statsQueries()).toContainEqual({ session_key: session.key }));
  expect(screen.getByText("dashboard.session")).toBeInTheDocument();
});
