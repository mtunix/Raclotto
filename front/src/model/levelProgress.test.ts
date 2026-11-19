import type { LevelDto } from "../api/generated/model";
import { levelProgress } from "./levelProgress";

const level = (id: number, required_experience: number): LevelDto => ({
    id, required_experience, name: `level.${id}`, label_de: `${id}`, label_en: `${id}`,
});

it("measures XP from the level towards the next one", () => {
    expect(levelProgress(130, level(2, 100), level(3, 250))).toEqual({ xpInLevel: 30, xpNeeded: 150, percent: 20 });
});

it("is full at the highest level", () => {
    expect(levelProgress(900, level(20, 800), null)).toEqual({ xpInLevel: 100, xpNeeded: 0, percent: 100 });
});

it("counts from 0 without a level and never goes below it or past full", () => {
    expect(levelProgress(50, null, level(2, 100))).toEqual({ xpInLevel: 50, xpNeeded: 100, percent: 50 });
    expect(levelProgress(90, level(2, 100), level(3, 250)).xpInLevel).toBe(0);
    expect(levelProgress(400, level(2, 100), level(3, 250)).percent).toBe(100);
});
