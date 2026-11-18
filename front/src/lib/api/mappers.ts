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
import { Pan } from "../../model/pan";
import { PrepType } from "../../model/prepType";
import {
  GeneratedProfilePicture,
  ProfilePictureEntry,
  ProfilePictureHistory,
} from "../../model/profilePicture";
import { RaclottoSession } from "../../model/raclottoSession";
import { Rating } from "../../model/rating";
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
