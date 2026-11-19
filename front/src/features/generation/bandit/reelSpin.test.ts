import { ingredientsForUser, rollOutcome } from "../../../lib/api/__fixtures__/backendResponses";
import { aimReels, columnSpan, type Reel, reelsAt, shuffledReels, spinDuration } from "./reelSpin";

const [potato, pork, aioli, leek] = ingredientsForUser;
const first = () => 0;

it("shuffles each reel over all the items", () => {
    const reels = shuffledReels([potato, leek], 3);
    expect(reels).toHaveLength(3);
    for (const reel of reels) {
        expect(reel.status).toBe("idle");
        expect(reel.items).toHaveLength(2);
        expect(reel.items).toEqual(expect.arrayContaining([potato, leek]));
        expect(reel.items[reel.index]).toBeDefined();
    }
});

describe("a spin", () => {
    const reels: Reel[] = [
        { status: "locked", items: [potato, leek], index: 1, emoji: "🥔" },
        { status: "locked", items: [leek, potato], index: 0, emoji: "🥔" },
    ];
    const spins = aimReels(reels, [leek, aioli]);

    it("aims each reel at the pan's ingredient in its position, adding it where the reel lacks it", () => {
        expect(spins[0]).toMatchObject({ items: [potato, leek], from: 1, target: 1 });
        expect(spins[1]).toMatchObject({ items: [leek, potato, aioli], from: 0, target: 2 });
    });

    it("stops the reels one after another", () => {
        expect(spins[0].stopsAt).toBeLessThan(spins[1].stopsAt);
        expect(spinDuration(spins)).toBe(spins[1].stopsAt);
    });

    it("runs each reel through its items from where it stood", () => {
        const start = reelsAt(spins, 0, first);
        expect(start.map((reel) => [reel.status, reel.index])).toEqual([["spinning", 1], ["spinning", 0]]);
        expect(reelsAt(spins, 50, first).map((reel) => reel.index)).toEqual([0, 1]);
        expect(reelsAt(spins, 150, first).map((reel) => reel.index)).toEqual([0, 0]);
    });

    it("locks each reel on its target with an emoji of the ingredient's kind", () => {
        const sauceSpin = aimReels(reels, [leek, aioli], first)[1];
        const fillSpin = aimReels(reels, [leek, aioli], first)[0];
        expect(sauceSpin.targetEmoji).not.toBe(fillSpin.targetEmoji);

        const halfway = reelsAt(spins, spins[0].stopsAt, first);
        expect(halfway.map((reel) => reel.status)).toEqual(["locked", "spinning"]);
        expect(halfway[0]).toMatchObject({ index: 1, emoji: spins[0].targetEmoji });

        const stopped = reelsAt(spins, spinDuration(spins), first);
        expect(stopped.map((reel) => reel.items[reel.index])).toEqual([leek, aioli]);
        expect(stopped.every((reel) => reel.status === "locked")).toBe(true);
    });

    it("refuses a pan with fewer ingredients than reels", () => {
        expect(() => aimReels(reels, [leek])).toThrow("Not enough ingredients");
    });
});

it("aims at the rolled pan's ingredients as they come from the server", () => {
    const reels = shuffledReels([potato, leek], 2);
    const spins = aimReels(reels, rollOutcome.pan.ingredients);
    const stopped = reelsAt(spins, spinDuration(spins));
    expect(stopped.map((reel) => reel.items[reel.index].id)).toEqual([potato.id, pork.id]);
});

it("lays out up to eight reels in a row on large screens", () => {
    expect(columnSpan(1)).toEqual({ xs: 24, sm: 24, md: 24, lg: 24 });
    expect(columnSpan(3)).toEqual({ xs: 24, sm: 12, md: 8, lg: 8 });
    expect(columnSpan(5)).toEqual({ xs: 24, sm: 12, md: 6, lg: 4 });
    expect(columnSpan(8)).toEqual({ xs: 24, sm: 12, md: 3, lg: 3 });
    expect(columnSpan(12)).toEqual({ xs: 24, sm: 12, md: 3, lg: 3 });
});
