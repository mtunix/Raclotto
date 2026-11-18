import { Achievement } from "./achievement";
import { Event } from "./event";
import { Level } from "./level";
import { Pan } from "./pan";

/** XP and level change caused by rolling a pan. */
export interface Reward {
    xp_gained: number;
    xp_before: number;
    xp_after: number;
    level: Level | null;
    previous_level: Level | null;
    next_level: Level | null;
    leveled_up: boolean;
}

/** Everything a pan roll (generate, bandit, clone) produced. */
export interface RollOutcome {
    pan: Pan;
    reward: Reward;
    achievements: Achievement[];
    events: Event[];
}
