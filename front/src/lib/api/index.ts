/**
 * The API module: one typed function per legacy (JSON:API) backend endpoint.
 * Typed endpoints are called through the generated client in `src/api/generated/`.
 *
 * Each function is a thin request through the {@link transport} seam whose
 * response is unwrapped by `jsonapi.ts` and mapped by exactly one mapper per
 * resource type (`mappers.ts`). Views never see wire shapes.
 */
import { Achievement } from "../../model/achievement";
import { Event } from "../../model/event";
import { EventConfig } from "../../model/eventConfig";
import { Ingredient } from "../../model/ingredient";
import { PrepType } from "../../model/prepType";
import {
  GeneratedProfilePicture,
  ProfilePictureHistory,
} from "../../model/profilePicture";
import { RaclottoSession } from "../../model/raclottoSession";
import { collection, plain, Resource, single } from "./jsonapi";
import {
  toAchievement,
  toEvent,
  toEventConfig,
  toIngredient,
  toPan,
  toPrepType,
  toProfilePictureHistory,
  toGeneratedProfilePicture,
  toSession,
} from "./mappers";
import { HttpMethod, RequestOptions, transport } from "./transport";
import {
  AvailableIngredientCounts,
  IngredientExport,
  IngredientImportResult,
  IngredientReimportResult,
  LeaderboardEntry,
  StatsResponse,
} from "./types";

function request(method: HttpMethod, path: string, options?: RequestOptions) {
  return transport().request(method, path, options);
}

/** JSON:API request document for a resource of `type`. */
function resourceBody(type: string, attributes: object, id?: number) {
  return { data: id === undefined ? { type, attributes } : { type, id, attributes } };
}

export type NewIngredient = Omit<Ingredient, "id" | "available">;

export const Api = {
  async listSessions(includeInactive = false): Promise<RaclottoSession[]> {
    const body = await request("GET", "/sessions", {
      query: { include_inactive: includeInactive ? "true" : undefined },
    });
    return collection(body).map(toSession);
  },

  async getSessionByKey(sessionKey: string): Promise<RaclottoSession> {
    const body = await request("GET", "/sessions/by-key", {
      query: { session_key: sessionKey },
    });
    return toSession(single(body));
  },

  async createSession(name: string): Promise<RaclottoSession> {
    const body = await request("POST", "/sessions", {
      body: resourceBody("session", { name }),
    });
    return toSession(single(body));
  },

  async updateSession(sessionId: number, name: string): Promise<RaclottoSession> {
    const body = await request("PATCH", `/sessions/${sessionId}`, {
      body: resourceBody("session", { name }),
    });
    return toSession(single(body));
  },

  async close(sessionKey: string): Promise<RaclottoSession> {
    const body = await request("POST", "/sessions/close", {
      body: resourceBody("session", { key: sessionKey }),
    });
    return toSession(single(body));
  },

  async reactivateSession(sessionKey: string): Promise<RaclottoSession> {
    const body = await request("POST", "/sessions/reactivate", {
      body: resourceBody("session", { key: sessionKey }),
    });
    return toSession(single(body));
  },


  async listIngredients(sessionKey: string): Promise<Ingredient[]> {
    const body = await request("GET", "/ingredients", {
      query: { session_key: sessionKey },
    });
    return collection(body).map(toIngredient);
  },

  async addIngredient(sessionKey: string, data: NewIngredient): Promise<Ingredient> {
    const body = await request("POST", "/ingredients", {
      body: resourceBody("ingredient", { ...data, session_key: sessionKey }),
    });
    return toIngredient(single(body));
  },

  async updateIngredient(
    ingredientId: number,
    data: Partial<Ingredient>,
  ): Promise<Ingredient> {
    const body = await request("PATCH", `/ingredients/${ingredientId}`, {
      body: resourceBody("ingredient", data, ingredientId),
    });
    return toIngredient(single(body));
  },

  async deleteIngredient(sessionKey: string, ingredientId: number): Promise<void> {
    await request("DELETE", `/ingredients/${ingredientId}`, {
      query: { session_key: sessionKey },
    });
  },

  async refill(ingredientId: number): Promise<Ingredient> {
    const body = await request("POST", "/ingredients/refill", {
      body: resourceBody("ingredient", {}, ingredientId),
    });
    return toIngredient(single(body));
  },

  async getAvailableIngredientCounts(
    sessionKey: string,
  ): Promise<AvailableIngredientCounts> {
    const body = await request("GET", "/ingredients/available-counts", {
      query: { session_key: sessionKey },
    });
    return plain<AvailableIngredientCounts>(body);
  },

  async exportIngredients(sessionKey: string): Promise<IngredientExport> {
    const body = await request("GET", "/ingredients/export", {
      query: { session_key: sessionKey },
    });
    return plain<IngredientExport>(body);
  },

  async importIngredients(
    sessionKey: string,
    ingredients: Partial<Ingredient>[],
  ): Promise<IngredientImportResult> {
    const body = await request("POST", "/ingredients/import", {
      query: { session_key: sessionKey },
      body: { ingredients },
    });
    return plain<IngredientImportResult>(body);
  },

  async reimportIngredients(
    sessionKey: string,
    ingredients: Partial<Ingredient>[],
  ): Promise<IngredientReimportResult> {
    const body = await request("POST", "/ingredients/reimport", {
      query: { session_key: sessionKey },
      body: { ingredients },
    });
    return plain<IngredientReimportResult>(body);
  },

  async listPrepTypes(sessionKey: string): Promise<PrepType[]> {
    const body = await request("GET", "/preparation_type", {
      query: { session_key: sessionKey },
    });
    return collection(body).map(toPrepType);
  },

  async addPrepType(sessionKey: string, name: string): Promise<PrepType> {
    const body = await request("POST", "/preparation_type", {
      query: { session_key: sessionKey },
      body: resourceBody("preparation_type", { name }),
    });
    return toPrepType(single(body));
  },

  async deletePrepType(prepTypeId: number): Promise<void> {
    await request("DELETE", `/preparation_type/${prepTypeId}`);
  },


  async getStats(sessionKey?: string): Promise<StatsResponse> {
    const body = await request("GET", "/stats", {
      query: { session_key: sessionKey },
    });
    const stats = plain<Omit<StatsResponse, "pans"> & { pans: Record<string, unknown>[] }>(body);
    return { ...stats, pans: stats.pans.map(toPan) };
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const body = await request("GET", "/achievements/leaderboard");
    return plain<LeaderboardEntry[]>(body);
  },

  async listAchievements(): Promise<Achievement[]> {
    const body = await request("GET", "/achievements");
    return collection(body).map(toAchievement);
  },


  async getEvents(sessionKey: string): Promise<Event[]> {
    const body = await request("GET", "/events", {
      query: { session_key: sessionKey },
    });
    return collection(body).map(toEvent);
  },

  async dismissEvent(eventId: number): Promise<void> {
    await request("POST", `/events/${eventId}/dismiss`, { body: {} });
  },

  async getEventConfigs(sessionKey?: string): Promise<EventConfig[]> {
    const body = await request("GET", "/events/configs", {
      query: { session_key: sessionKey },
    });
    return collection(body).map(toEventConfig);
  },

  async updateEventConfig(config: {
    event_type: string;
    enabled: boolean;
    frequency_minutes?: number | null;
    session_key?: string;
  }): Promise<EventConfig> {
    const body = await request("POST", "/events/configs", {
      body: resourceBody("event_config", config),
    });
    return toEventConfig(single(body));
  },


  async getProfilePictureHistory(userId: number): Promise<ProfilePictureHistory> {
    const body = await request("GET", `/images/profile-picture-history/${userId}`);
    // This resource is sent without an id; its attributes are the payload
    return toProfilePictureHistory(plain<Resource>(body).attributes);
  },

  async setCandidatePicture(pictureId: number): Promise<void> {
    await request("POST", `/images/set-candidate-picture/${pictureId}`, { body: {} });
  },

  async generateProfilePicture(levelId?: number): Promise<GeneratedProfilePicture> {
    // The image endpoints read a plain JSON body, not a JSON:API document
    const body = await request("POST", "/images/generate-profile-picture", {
      body: levelId !== undefined ? { level_id: levelId } : {},
    });
    return toGeneratedProfilePicture(plain<Resource>(body).attributes);
  },
};
