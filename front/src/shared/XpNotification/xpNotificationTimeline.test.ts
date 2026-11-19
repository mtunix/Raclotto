import type { AchievementDto, LevelDto, RewardDto } from "../../api/generated/model";
import { FADE_MS, LEVEL_UP_PAGE_MS, PAGE_MS, skipTo, xpNotificationFrame } from "./xpNotificationTimeline";

const level = (id: number, required_experience: number): LevelDto => ({
    id, required_experience, name: `level.${id}`, label_de: `${id}`, label_en: `${id}`,
});

const gain: RewardDto = {
    xp_before: 130, xp_after: 160, xp_gained: 30,
    previous_level: level(2, 100), level: level(2, 100), next_level: level(3, 250), leveled_up: false,
};

// From 100 XP into level 2 (100–250) to 10 XP into level 3 (250–500).
const levelUp: RewardDto = {
    xp_before: 200, xp_after: 260, xp_gained: 60,
    previous_level: level(2, 100), level: level(3, 250), next_level: level(4, 500), leveled_up: true,
};

const achievement = (id: number): AchievementDto => ({
    id, key: null, value: 5, hidden: false,
});
const [first, second] = [achievement(1), achievement(2)];

const xpPage = (reward: RewardDto, ms: number) => {
    const frame = xpNotificationFrame(reward, [], ms);
    if (frame?.page !== "xp") throw new Error(`no XP page at ${ms} ms`);
    return frame;
};

it("fills the bar from the XP before to the XP after", () => {
    expect(xpPage(gain, 0).bar).toEqual({ xpInLevel: 30, xpNeeded: 150, percent: 20 });
    expect(xpPage(gain, 1000).bar.xpInLevel).toBeGreaterThan(30);
    expect(xpPage(gain, 2500)).toMatchObject({ stage: "gaining", bar: { xpInLevel: 60, xpNeeded: 150, percent: 40 } });
});

it("starts a level-up from where the previous level left off", () => {
    expect(xpPage(levelUp, 0)).toMatchObject({
        stage: "filling-old-level",
        bar: { xpInLevel: 100, xpNeeded: 150 },
    });
    expect(xpPage(levelUp, 0).bar.percent).toBeCloseTo(66.67, 1);
    expect(xpPage(levelUp, 2200).bar).toEqual({ xpInLevel: 150, xpNeeded: 150, percent: 100 });
});

it("shows the level-up, then fills the new level from a sliver", () => {
    expect(xpPage(levelUp, 2500).stage).toBe("level-up-message");
    expect(xpPage(levelUp, 4500)).toMatchObject({
        stage: "new-level-progress",
        bar: { xpInLevel: 0, xpNeeded: 250, percent: 0.1 },
    });
    expect(xpPage(levelUp, 6000).bar).toEqual({ xpInLevel: 10, xpNeeded: 250, percent: 4 });
});

it("shows each unlocked achievement after the XP page, fading between pages", () => {
    const at = (ms: number) => xpNotificationFrame(gain, [first, second], ms);

    expect(at(PAGE_MS - 1)).toMatchObject({ page: "xp", opacity: 1 });
    expect(at(PAGE_MS)).toMatchObject({ page: "xp", opacity: 0 });
    expect(at(PAGE_MS + FADE_MS)).toMatchObject({ page: "achievement", achievement: first, opacity: 1 });
    expect(at(2 * (PAGE_MS + FADE_MS))).toMatchObject({ page: "achievement", achievement: second });
    expect(at(3 * (PAGE_MS + FADE_MS) - 1)).toMatchObject({ achievement: second, opacity: 0 });
    expect(at(3 * (PAGE_MS + FADE_MS))).toBeNull();
});

it("keeps a level-up's XP page up for its whole sequence", () => {
    expect(xpNotificationFrame(levelUp, [], LEVEL_UP_PAGE_MS - 1)).toMatchObject({ page: "xp", opacity: 1 });
    expect(xpNotificationFrame(levelUp, [], LEVEL_UP_PAGE_MS + FADE_MS)).toBeNull();
});

it("skips to the end of the current page", () => {
    expect(skipTo(gain, [first], 1000)).toBe(PAGE_MS);
    expect(skipTo(gain, [first], PAGE_MS + 100)).toBe(PAGE_MS + 100);
    expect(skipTo(gain, [first], PAGE_MS + FADE_MS + 10)).toBe(2 * PAGE_MS + FADE_MS);
    expect(skipTo(gain, [], 10_000)).toBe(10_000);
});
