import { act, render, screen } from "@testing-library/react";
import type { RollOutcomeDto } from "../../api/generated/model";
import { useAppStore } from "../../AppSlice";
import { useAuthStore } from "../../AuthSlice";
import { applyRollOutcome } from "../../features/generation/applyRollOutcome";
import { me, rollOutcome } from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../lib/api/fakeTransport";
import { setTransport, type Transport } from "../../lib/api/transport";
import { XpNotification } from "./XpNotification";

const { level, next_level } = rollOutcome.reward;

// A level-up out of the fixture's level 2 (100–250 XP), 100 XP into it, into level 3.
const levelUp: RollOutcomeDto = {
    ...rollOutcome,
    achievements: [],
    reward: {
        ...rollOutcome.reward,
        xp_before: 200,
        xp_after: 260,
        xp_gained: 60,
        previous_level: level,
        level: next_level,
        next_level: next_level && { ...next_level, id: 4, name: "level.4", required_experience: 500 },
        leveled_up: true,
    },
};

let previous: Transport;

beforeEach(() => {
    previous = setTransport(new FakeTransport());
    useAuthStore.setState({ user: me });
    useAppStore.getState().hideXpNotification();
});

afterEach(() => {
    setTransport(previous);
});

it("fills a level-up's bar from the XP into the previous level", () => {
    render(<XpNotification />);

    act(() => {
        applyRollOutcome(levelUp, "s1");
    });

    expect(screen.getByText("100 / 150 XP")).toBeInTheDocument();
});

it("shows nothing until a roll earns XP", () => {
    render(<XpNotification />);

    expect(screen.queryByText(/XP$/)).not.toBeInTheDocument();
});
