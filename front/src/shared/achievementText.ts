import type { AchievementDto } from "../api/generated/model";

type Translate = (key: string) => string;

// An achievement default_data no longer seeds has no key; it still counts for whoever holds it.
const textKey = ({ key }: Pick<AchievementDto, "key">, part: "title" | "description") =>
  key === null ? `achievements.retired.${part}` : `achievements.${key}.${part}`;

/** The achievement's title in the UI's language. */
export function achievementTitle(achievement: Pick<AchievementDto, "key">, t: Translate): string {
  return t(textKey(achievement, "title"));
}

/** What the achievement asks for, in the UI's language. */
export function achievementDescription(achievement: Pick<AchievementDto, "key">, t: Translate): string {
  return t(textKey(achievement, "description"));
}
