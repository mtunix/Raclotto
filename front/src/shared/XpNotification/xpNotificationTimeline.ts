import type { AchievementDto, RewardDto } from "../../api/generated/model";
import { LevelProgress, levelProgress } from "../../model/levelProgress";

export const PAGE_MS = 3000;
export const FADE_MS = 500;
// A level-up fills the old level's bar, holds it, shows the message, then fills the new level's.
const FILL_OLD_MS = 2000;
const HOLD_MS = 500;
const MESSAGE_MS = 2000;
const FILL_NEW_MS = 1500;
const GAIN_MS = 2500;
export const LEVEL_UP_PAGE_MS = 9000;

export type XpStage = "gaining" | "filling-old-level" | "level-up-message" | "new-level-progress";

export type XpNotificationFrame =
    | { page: "xp"; stage: XpStage; bar: LevelProgress; opacity: number }
    | { page: "achievement"; achievement: AchievementDto; opacity: number };

/**
 * What the XP notification shows at a moment, as a pure function of the reward, the achievements
 * it unlocked and the time since it appeared: the XP page (with its level-up stages), then one page
 * per achievement. Each page fades out before the next; `null` once the last one has.
 */
export function xpNotificationFrame(
    reward: RewardDto,
    achievements: AchievementDto[],
    elapsedMs: number,
): XpNotificationFrame | null {
    const page = pageAt(reward, achievements, elapsedMs);
    if (!page) return null;
    const opacity = elapsedMs >= page.fadeAt ? 0 : 1;
    if (page.index === 0) {
        return { page: "xp", ...xpPage(reward, elapsedMs), opacity };
    }
    return { page: "achievement", achievement: achievements[page.index - 1], opacity };
}

/** Where a click skips to: the end of the current page, so it fades out at once. */
export function skipTo(reward: RewardDto, achievements: AchievementDto[], elapsedMs: number): number {
    const page = pageAt(reward, achievements, elapsedMs);
    return page ? Math.max(elapsedMs, page.fadeAt) : elapsedMs;
}

function pageAt(reward: RewardDto, achievements: AchievementDto[], elapsedMs: number) {
    let start = 0;
    for (let index = 0; index <= achievements.length; index++) {
        const fadeAt = start + (index === 0 && reward.leveled_up ? LEVEL_UP_PAGE_MS : PAGE_MS);
        if (elapsedMs < fadeAt + FADE_MS) return { index, fadeAt };
        start = fadeAt + FADE_MS;
    }
    return null;
}

function xpPage(reward: RewardDto, t: number): { stage: XpStage; bar: LevelProgress } {
    const { xp_before, xp_after, previous_level, level, next_level } = reward;
    const after = levelProgress(xp_after, level, next_level);

    if (!reward.leveled_up) {
        const before = levelProgress(xp_before, level, next_level);
        const xp = Math.round(before.xpInLevel + (after.xpInLevel - before.xpInLevel) * easeOut(t / GAIN_MS));
        return { stage: "gaining", bar: t >= GAIN_MS ? after : bar(xp, after.xpNeeded, 0) };
    }

    if (t < FILL_OLD_MS + HOLD_MS) {
        const old = levelProgress(xp_before, previous_level, level);
        const percent = old.percent + (100 - old.percent) * easeOut(t / FILL_OLD_MS);
        return {
            stage: "filling-old-level",
            bar: { xpInLevel: Math.round((percent / 100) * old.xpNeeded), xpNeeded: old.xpNeeded, percent },
        };
    }
    const newLevelAt = FILL_OLD_MS + HOLD_MS + MESSAGE_MS;
    if (t < newLevelAt) {
        return { stage: "level-up-message", bar: { xpInLevel: 0, xpNeeded: after.xpNeeded, percent: 0 } };
    }
    if (t >= newLevelAt + FILL_NEW_MS) {
        return { stage: "new-level-progress", bar: after };
    }
    const xp = Math.round(after.xpInLevel * easeOut((t - newLevelAt) / FILL_NEW_MS));
    // A sliver of bar from the start, so it is seen to fill.
    return { stage: "new-level-progress", bar: bar(xp, after.xpNeeded, 0.1) };
}

function bar(xpInLevel: number, xpNeeded: number, minPercent: number): LevelProgress {
    const percent = xpNeeded > 0 ? Math.min(100, Math.max(minPercent, (xpInLevel / xpNeeded) * 100)) : 100;
    return { xpInLevel, xpNeeded, percent };
}

function easeOut(progress: number): number {
    return 1 - Math.pow(1 - Math.min(Math.max(progress, 0), 1), 3);
}
