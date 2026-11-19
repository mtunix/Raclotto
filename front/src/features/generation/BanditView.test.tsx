import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useAuthStore } from "../../AuthSlice";
import {
    availableCounts,
    generatedPicture,
    ingredientsForUser,
    me,
    rating,
    rollOutcome,
    session,
} from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../lib/api/fakeTransport";
import { setTransport, type Transport } from "../../lib/api/transport";
import { renderRoute } from "../../testUtils";
import { BanditView } from "./BanditView";

const { pan } = rollOutcome;

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport()
        .on("GET", "/ingredients/available-counts", availableCounts)
        .on("POST", "/pans/generate/bandit", rollOutcome)
        .on("POST", "/ratings", rating)
        .on("GET", `/pans/${pan.id}`, pan)
        .on("POST", "/images/generate-profile-picture", generatedPicture)
        .on("GET", "/auth/me", me);
    previous = setTransport(fake);
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
    vi.useRealTimers();
});

function renderBandit() {
    renderRoute(
        <BanditView
            ingredients={ingredientsForUser}
            sessionKey={session.key}
            rollPreparationType={false}
            onRollPreparationTypeChange={() => {}}
            rollCheese={true}
            onRollCheeseChange={() => {}}
        />,
    );
}

/** Spins two columns, the most the fixture's applicable ingredients allow, and lets them stop. */
async function spin() {
    renderBandit();
    fireEvent.click(await screen.findByText("−"));
    vi.useFakeTimers();
    fireEvent.click(screen.getByText("generate.banditSpin"));
    await act(async () => {
        await vi.advanceTimersByTimeAsync(20000);
    });
    vi.useRealTimers();
    return screen.findByRole("dialog");
}

it("rolls the pan for the columns, then shows it once they stop", async () => {
    const dialog = await spin();

    expect(fake.last("POST", "/pans/generate/bandit")).toMatchObject({
        query: { session_key: session.key },
        body: { total_columns: 2, roll_prep_type: false, roll_cheese: true },
    });
    expect(within(dialog).getByText(pan.name as string)).toBeInTheDocument();
    expect(useAuthStore.getState().user?.experience_points).toBe(rollOutcome.reward.xp_after);
});

it("rates the result, and offers the level-up picture once it closes", async () => {
    const dialog = await spin();

    const fourthStar = within(dialog).getAllByRole("radio")[3];
    fireEvent.click(fourthStar.querySelector(".ant-rate-star-second") as HTMLElement);
    await waitFor(() => expect(fake.last("POST", "/ratings")?.body).toEqual({ pan_id: pan.id, rating: 4 }));
    expect(fake.last("POST", "/images/generate-profile-picture")).toBeUndefined();

    fireEvent.click(within(dialog.closest(".ant-modal") as HTMLElement).getByRole("button", { name: "Close" }));

    await waitFor(() => expect(fake.last("POST", "/images/generate-profile-picture")?.body)
        .toEqual({ level_id: rollOutcome.reward.level?.id }));
});

it("stops every column on the pan's ingredients", async () => {
    const dialog = await spin();

    expect(within(dialog).getByText("Potato")).toBeInTheDocument();
    expect(within(dialog).getByText("Pork")).toBeInTheDocument();
    expect(dialog.querySelectorAll(".bandit-locked-emoji")).toHaveLength(2);
    expect(dialog.querySelector(".bandit-spinning-emoji")).toBeNull();
});

it("counts what the diet excludes against all available ingredients", async () => {
    renderBandit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("generate.availableIngredients: 2 / 3 (1 generate.excluded)");
    expect(alert).toHaveTextContent("generate.availableSauces: 0 / 1 (1 generate.excluded)");
});

it("reports a failed roll and offers the lever again", async () => {
    fake.on("POST", "/pans/generate/bandit", () => {
        throw Object.assign(new Error("Server error"), { status: 500 });
    });
    renderBandit();
    fireEvent.click(await screen.findByText("−"));
    fireEvent.click(screen.getByText("generate.banditSpin"));

    expect(await screen.findByText("generate.banditError")).toBeInTheDocument();
    expect(screen.getByText("generate.banditSpin")).toBeInTheDocument();
});
