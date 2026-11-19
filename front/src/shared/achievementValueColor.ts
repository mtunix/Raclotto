/** The tag color for an achievement worth `value` points. */
export function achievementValueColor(value: number): string {
    if (value >= 30) return "red";
    if (value >= 15) return "orange";
    if (value >= 10) return "gold";
    if (value >= 5) return "blue";
    return "default";
}
