/**
 * Exactly one mapper per resource type: wire fields → domain object.
 *
 * Every mapper takes the *flattened* fields of a record (`{ id, ...attributes }`,
 * see `jsonapi.ts`) or an already-flat nested dict such as a pan's
 * ingredients. Mappers own defaults for fields some endpoints omit, so a
 * domain object has the same shape no matter which endpoint produced it.
 */
import { Achievement } from "../../model/achievement";
import { Event } from "../../model/event";
import { EventConfig } from "../../model/eventConfig";
import { Ingredient, IngredientType } from "../../model/ingredient";
import { Invite } from "../../model/invite";
import { Level } from "../../model/level";
import { Pan } from "../../model/pan";
import { PrepType } from "../../model/prepType";
import {
  GeneratedProfilePicture,
  ProfilePictureEntry,
  ProfilePictureHistory,
} from "../../model/profilePicture";
import { RaclottoSession } from "../../model/raclottoSession";
import { Rating } from "../../model/rating";
import { User, UserStats } from "../../model/user";
import { toId } from "./jsonapi";

type Raw = Record<string, unknown>;

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" ? v : fallback;
const bool = (v: unknown, fallback = false): boolean =>
  typeof v === "boolean" ? v : fallback;
const optStr = (v: unknown): string | null =>
  typeof v === "string" ? v : null;
const optNum = (v: unknown): number | null =>
  typeof v === "number" ? v : null;
const list = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

export function toLevel(r: Raw): Level {
  return {
    id: toId(r.id),
    name: str(r.name),
    required_experience: num(r.required_experience),
  };
}

const optLevel = (v: unknown): Level | null =>
  v && typeof v === "object" ? toLevel(v as Raw) : null;

export function toIngredient(r: Raw): Ingredient {
  const ingredient: Ingredient = {
    id: toId(r.id),
    name: str(r.name),
    type: num(r.type, IngredientType.FILL) as IngredientType,
    available: bool(r.available, true),
    meat: bool(r.meat),
    vegetarian: bool(r.vegetarian),
    vegan: bool(r.vegan),
    gluten: bool(r.gluten),
    histamine: bool(r.histamine),
    fructose: bool(r.fructose),
    lactose: bool(r.lactose),
    fish: bool(r.fish),
    spicy: num(r.spicy),
    wildcard: bool(r.wildcard),
    sweet: bool(r.sweet),
  };
  // Only the session ingredient list computes `applicable` for the current user
  if (typeof r.applicable === "boolean") {
    ingredient.applicable = r.applicable;
  }
  return ingredient;
}

export function toPrepType(r: Raw): PrepType {
  return {
    id: toId(r.id),
    name: str(r.name),
    session_id: optNum(r.session_id),
  };
}

export function toRating(r: Raw): Rating {
  return {
    id: toId(r.id),
    rating: num(r.rating),
    user_id: num(r.user_id),
    pan_id: num(r.pan_id),
  };
}

/**
 * Pan as GET /stats still sends it (`Pan.as_dict()`, no author fields). The
 * migrated pan endpoints return the generated `PanDto` instead.
 */
export function toPan(r: Raw): Pan {
  const pan: Pan = {
    id: toId(r.id),
    name: str(r.name),
    timestamp: str(r.timestamp),
    snacked: bool(r.snacked),
    user: str(r.user),
    user_id: optNum(r.user_id) ?? undefined,
    user_color: optStr(r.user_color) ?? undefined,
    user_profile_picture: optStr(r.user_profile_picture) ?? undefined,
    user_border_style: optStr(r.user_border_style) ?? undefined,
    user_border_texture: optStr(r.user_border_texture),
    user_glow_effect: bool(r.user_glow_effect),
    ingredients: list(r.ingredients).map(toIngredient),
    ratings: list(r.ratings).map(toRating),
    rating: num(r.rating),
    preparation_type_id: optNum(r.preparation_type_id) ?? undefined,
    cheese_level: optNum(r.cheese_level) ?? undefined,
  };
  if (r.preparation_type && typeof r.preparation_type === "object") {
    pan.preparation_type = toPrepType(r.preparation_type as Raw);
  }
  return pan;
}

export function toSession(r: Raw): RaclottoSession {
  return RaclottoSession.fromParsed({
    id: toId(r.id),
    key: str(r.key),
    name: str(r.name),
    timestamp: str(r.timestamp),
    active: bool(r.active, true),
  });
}

export function toAchievement(r: Raw): Achievement {
  const achievement: Achievement = {
    id: toId(r.id),
    title: str(r.title),
    description: str(r.description),
    value: num(r.value),
    hidden: bool(r.hidden),
  };
  // Only the achievement list carries per-user unlock state / progress
  if (typeof r.unlocked === "boolean") achievement.unlocked = r.unlocked;
  if (typeof r.progress === "number") achievement.progress = r.progress;
  return achievement;
}

export function toEvent(r: Raw): Event {
  return {
    id: toId(r.id),
    event_type: str(r.event_type),
    message: str(r.message),
    data: (r.data ?? undefined) as Event["data"],
    created_at: str(r.created_at),
  };
}

export function toEventConfig(r: Raw): EventConfig {
  return {
    id: toId(r.id),
    event_type: str(r.event_type),
    session_id: optNum(r.session_id),
    enabled: bool(r.enabled, true),
    frequency_minutes: optNum(r.frequency_minutes),
  };
}

export function toInvite(r: Raw): Invite {
  return {
    id: toId(r.id),
    token: str(r.token),
    email: str(r.email),
    expires_at: str(r.expires_at),
    is_used: bool(r.is_used),
    used_at: optStr(r.used_at),
  };
}

/**
 * User (GET/PATCH /auth/me, GET /users/:id). `level`/`next_level` are only
 * sent by the GET endpoints and `achievements` only by /users/:id; absent keys
 * stay absent so spreading a PATCH result over a known user keeps its level.
 */
export function toUser(r: Raw): User {
  const user: User = {
    id: toId(r.id),
    name: str(r.name),
    email: str(r.email),
    meat: bool(r.meat),
    vegetarian: bool(r.vegetarian, true),
    vegan: bool(r.vegan, true),
    fish: bool(r.fish),
    histamine: bool(r.histamine, true),
    fructose: bool(r.fructose, true),
    lactose: bool(r.lactose, true),
    gluten: bool(r.gluten, true),
    profile_picture: optStr(r.profile_picture),
    border_texture: optStr(r.border_texture),
    glow_effect: bool(r.glow_effect),
  };
  if (typeof r.color === "string") user.color = r.color;
  if (typeof r.language === "string") user.language = r.language;
  if (typeof r.border_style === "string") user.border_style = r.border_style;
  if (typeof r.experience_points === "number")
    user.experience_points = r.experience_points;
  if ("level" in r) user.level = optLevel(r.level) ?? undefined;
  if ("next_level" in r) user.next_level = optLevel(r.next_level);
  // The GET endpoints send a level but omit next_level at the max level
  else if ("level" in r) user.next_level = null;
  if ("achievements" in r) user.achievements = list(r.achievements).map(toAchievement);
  return user;
}

export function toUserStats(r: Raw): UserStats {
  // Embedded ingredients only carry id/name/type (+avg_rating); the
  // ingredient mapper fills the dietary flags with their defaults.
  const optIngredient = (v: unknown) =>
    v && typeof v === "object" ? toIngredient(v as Raw) : null;
  const best = r.best_rated_ingredient as Raw | null | undefined;
  const biggest = r.most_ingredients_pan as Raw | null | undefined;
  return {
    total_pans: num(r.total_pans),
    total_ratings_given: num(r.total_ratings_given),
    average_rating_received: num(r.average_rating_received),
    favorite_ingredient: optIngredient(r.favorite_ingredient),
    best_rated_ingredient: best
      ? { ...toIngredient(best), avg_rating: num(best.avg_rating) }
      : null,
    total_achievement_points: num(r.total_achievement_points),
    average_ingredients_per_pan: num(r.average_ingredients_per_pan),
    most_pans_session: (r.most_pans_session ?? null) as UserStats["most_pans_session"],
    sessions_participated: num(r.sessions_participated),
    most_ingredients_pan: biggest
      ? {
          id: toId(biggest.id),
          name: str(biggest.name),
          ingredient_count: num(biggest.ingredient_count),
          ingredients: list(biggest.ingredients).map(toIngredient),
        }
      : null,
  };
}

export function toProfilePictureEntry(r: Raw): ProfilePictureEntry {
  return {
    id: toId(r.id),
    profile_picture: str(r.profile_picture),
    created_at: str(r.created_at),
    level_id: optNum(r.level_id),
    level_name: optStr(r.level_name),
    is_candidate: bool(r.is_candidate),
  };
}

export function toProfilePictureHistory(r: Raw): ProfilePictureHistory {
  return {
    history: list(r.history).map(toProfilePictureEntry),
    total_count: num(r.total_count),
    user_id: num(r.user_id),
    user_name: str(r.user_name),
  };
}

export function toGeneratedProfilePicture(r: Raw): GeneratedProfilePicture {
  return {
    imageBase64: str(r.imageBase64),
    format: str(r.format, "png"),
    userId: num(r.userId),
    levelId: optNum(r.levelId),
    createdAt: optStr(r.createdAt),
  };
}
