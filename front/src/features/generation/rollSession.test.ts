import { rollOutcome } from "../../lib/api/__fixtures__/backendResponses";
import { idle, RollEvent, rollSession, RollState } from "./rollSession";

const pan = rollOutcome.pan;
const other = { ...pan, id: pan.id + 1 };
const noLevelUp = { leveledUp: false };
const levelUp = (newLevelId: number) => ({ leveledUp: true, newLevelId });

const run = (...events: RollEvent[]): RollState => events.reduce(rollSession, idle);

it("shows the result once both the outcome and the animation are in", () => {
    const outcomeFirst = run({ type: "roll", animated: true }, { type: "rolled", pan, levelUp: noLevelUp });
    expect(outcomeFirst).toEqual({ phase: "revealing", pan, leveledUp: false, levelUpId: undefined });
    expect(rollSession(outcomeFirst, { type: "animationDone" })).toMatchObject({ phase: "result", pan });

    const animationFirst = run({ type: "roll", animated: true }, { type: "animationDone" });
    expect(animationFirst).toMatchObject({ phase: "rolling", animationDone: true });
    expect(rollSession(animationFirst, { type: "rolled", pan, levelUp: noLevelUp })).toMatchObject({ phase: "result", pan });
});

it("shows a roll without animation as soon as it is in", () => {
    expect(run({ type: "roll", animated: false }, { type: "rolled", pan, levelUp: noLevelUp }))
        .toEqual({ phase: "result", pan, leveledUp: false, levelUpId: undefined });
});

it("offers the level-up picture when the result closes", () => {
    const result = run({ type: "roll", animated: false }, { type: "rolled", pan, levelUp: levelUp(3) });
    expect(result).toMatchObject({ phase: "result", leveledUp: true, levelUpId: 3 });

    const picture = rollSession(result, { type: "close" });
    expect(picture).toEqual({ phase: "picture", levelUpId: 3 });
    expect(rollSession(picture, { type: "pictureClosed" })).toEqual(idle);
});

it("closes straight to idle without a level-up", () => {
    expect(run({ type: "roll", animated: false }, { type: "rolled", pan, levelUp: noLevelUp }, { type: "close" }))
        .toEqual(idle);
});

it("keeps a level-up to offer when rolling again from the result", () => {
    const again = run(
        { type: "roll", animated: false },
        { type: "rolled", pan, levelUp: levelUp(3) },
        { type: "roll", animated: false },
        { type: "rolled", pan: other, levelUp: noLevelUp },
    );
    expect(again).toMatchObject({ phase: "result", pan: other, leveledUp: false, levelUpId: 3 });
    expect(rollSession(again, { type: "close" })).toEqual({ phase: "picture", levelUpId: 3 });
});

it("goes back to where it started when the roll fails", () => {
    expect(run({ type: "roll", animated: true }, { type: "failed" })).toEqual(idle);

    const result = run({ type: "roll", animated: false }, { type: "rolled", pan, levelUp: levelUp(3) });
    expect(run({ type: "roll", animated: false }, { type: "rolled", pan, levelUp: levelUp(3) },
        { type: "roll", animated: true }, { type: "failed" })).toEqual(result);
});

it("ignores what does not fit the phase", () => {
    const rolling = run({ type: "roll", animated: true });
    expect(rollSession(rolling, { type: "roll", animated: true })).toBe(rolling);
    expect(rollSession(rolling, { type: "close" })).toBe(rolling);
    expect(rollSession(idle, { type: "rolled", pan, levelUp: noLevelUp })).toBe(idle);
    expect(rollSession(idle, { type: "animationDone" })).toBe(idle);
    expect(rollSession(idle, { type: "pictureClosed" })).toBe(idle);
});
