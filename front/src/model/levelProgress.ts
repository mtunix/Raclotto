import type { LevelDto } from "../api/generated/model";

export interface LevelProgress {
    /** XP earned since reaching `level`. */
    xpInLevel: number;
    /** XP from `level` to the next one; 0 at the highest level. */
    xpNeeded: number;
    /** 0–100; 100 at the highest level. */
    percent: number;
}

/** How far `xp` has come from `level` towards `nextLevel`; no level counts as 0 XP. */
export function levelProgress(xp: number, level: LevelDto | null, nextLevel: LevelDto | null): LevelProgress {
    const base = level?.required_experience ?? 0;
    const xpInLevel = Math.max(0, xp - base);
    const xpNeeded = nextLevel ? Math.max(0, nextLevel.required_experience - base) : 0;
    const percent = xpNeeded > 0 ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;
    return { xpInLevel, xpNeeded, percent };
}
