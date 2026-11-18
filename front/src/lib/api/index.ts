/**
 * The API module: one typed function per backend endpoint.
 *
 * Each function is a thin request through the {@link transport} seam whose
 * response is unwrapped by `jsonapi.ts` and mapped by exactly one mapper per
 * resource type (`mappers.ts`). Views never see wire shapes.
 */
import { Achievement } from "../../model/achievement";
import { Event } from "../../model/event";
import { EventConfig } from "../../model/eventConfig";
import { Ingredient } from "../../model/ingredient";
import { Invite } from "../../model/invite";
import { Pan } from "../../model/pan";
import { PrepType } from "../../model/prepType";
import {
  GeneratedProfilePicture,
  ProfilePictureHistory,
} from "../../model/profilePicture";
import { RaclottoSession } from "../../model/raclottoSession";
import { Rating } from "../../model/rating";
import { RollOutcome } from "../../model/rollOutcome";
import { AuthResult, User, UserStats } from "../../model/user";
import { collection, flatten, meta, plain, Resource, single } from "./jsonapi";
import {
  RollMeta,
  toAchievement,
  toEvent,
  toEventConfig,
  toIngredient,
  toInvite,
  toPan,
  toPrepType,
  toProfilePictureHistory,
  toGeneratedProfilePicture,
  toRating,
  toRollOutcome,
  toSession,
  toUser,
  toUserStats,
} from "./mappers";
import { HttpMethod, QueryValue, RequestOptions, transport } from "./transport";
import {
  AvailableIngredientCounts,
  IngredientExport,
  IngredientImportResult,
  IngredientReimportResult,
  LeaderboardEntry,
  PanPage,
  StatsResponse,
} from "./types";

export type { PanPage } from "./types";

function request(method: HttpMethod, path: string, options?: RequestOptions) {
  return transport().request(method, path, options);
}

/** JSON:API request document for a resource of `type`. */
function resourceBody(type: string, attributes: object, id?: number) {
  return { data: id === undefined ? { type, attributes } : { type, id, attributes } };
}

async function roll(path: string, options: RequestOptions): Promise<RollOutcome> {
  const body = await request("POST", path, options);
  return toRollOutcome(single(body), meta<Partial<RollMeta>>(body));
}

async function pansPage(
  query: Record<string, QueryValue> & { limit: number; offset: number },
): Promise<PanPage> {
  const body = await request("GET", "/pans", { query });
  const pans = collection(body).map(toPan);
  const { total = 0, has_more } = meta<{ total?: number; has_more?: boolean }>(body);
  return {
    data: pans,
    hasMore: has_more ?? query.offset + pans.length < total,
    total,
  };
}

function authResult(body: unknown): AuthResult {
  const fields = single(body);
  const { token } = meta<{ token?: string }>(body);
  if (!token) {
    throw new Error("Invalid auth response: missing token");
  }
  return {
    token,
    user: {
      id: fields.id,
      name: String(fields.name ?? ""),
      email: String(fields.email ?? ""),
      profile_picture: (fields.profile_picture as string | null) ?? null,
    },
  };
}

export type UserUpdate = Partial<
  Pick<
    User,
    | "name"
    | "meat"
    | "vegetarian"
    | "vegan"
    | "fish"
    | "histamine"
    | "fructose"
    | "lactose"
    | "gluten"
    | "color"
    | "language"
    | "border_style"
    | "border_texture"
    | "glow_effect"
  >
> & { profile_picture?: string | null };

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


  generate(
    sessionKey: string,
    numFill: number,
    numSauce: number,
    preparationTypeId?: number,
    rollCheese?: boolean,
  ): Promise<RollOutcome> {
    return roll("/pans/generate", {
      query: { session_key: sessionKey },
      body: resourceBody("generationParameters", {
        numFill,
        numSauce,
        ...(preparationTypeId ? { preparation_type_id: preparationTypeId } : {}),
        ...(rollCheese !== undefined ? { roll_cheese: rollCheese } : {}),
      }),
    });
  },

  generateBandit(
    sessionKey: string,
    totalColumns: number,
    rollPrepType: boolean,
    rollCheese?: boolean,
  ): Promise<RollOutcome> {
    return roll("/pans/generate/bandit", {
      query: { session_key: sessionKey },
      body: resourceBody("generationParameters", {
        total_columns: totalColumns,
        roll_prep_type: rollPrepType,
        ...(rollCheese !== undefined ? { roll_cheese: rollCheese } : {}),
      }),
    });
  },

  clonePan(sessionKey: string, pan: Pan): Promise<RollOutcome> {
    return roll("/pans", {
      query: { session_key: sessionKey },
      body: resourceBody("pan", {
        name: pan.name,
        ingredients: pan.ingredients.map((ing) => ing.id),
      }),
    });
  },

  getPansPaginated(sessionKey: string, limit = 12, offset = 0): Promise<PanPage> {
    return pansPage({ session_key: sessionKey, limit, offset });
  },

  getPansByUser(userId: number, limit = 12, offset = 0): Promise<PanPage> {
    return pansPage({ user_id: userId, limit, offset });
  },

  async rate(sessionKey: string, panId: number, rating: number): Promise<Rating> {
    const body = await request("POST", "/ratings", {
      query: { session_key: sessionKey },
      body: resourceBody("rating", { pan_id: panId, rating }),
    });
    return toRating(single(body));
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


  async login(emailOrName: string, password: string): Promise<AuthResult> {
    const body = await request("POST", "/auth/login", {
      body: resourceBody("login", { email: emailOrName, password }),
    });
    return authResult(body);
  },

  async register(
    token: string,
    email: string,
    name: string,
    password: string,
    profile_picture?: string,
  ): Promise<AuthResult> {
    const body = await request("POST", "/auth/register", {
      body: resourceBody("register", {
        token,
        email,
        name,
        password,
        ...(profile_picture ? { profile_picture } : {}),
      }),
    });
    return authResult(body);
  },

  async getInviteByToken(token: string): Promise<Invite> {
    const body = await request("GET", `/auth/invite/${encodeURIComponent(token)}`);
    return toInvite(single(body));
  },

  async getCurrentUser(): Promise<User> {
    return toUser(single(await request("GET", "/auth/me")));
  },

  async updateCurrentUser(attributes: UserUpdate): Promise<User> {
    const body = await request("PATCH", "/auth/me", {
      body: resourceBody("user", attributes),
    });
    return toUser(single(body));
  },

  async getUserProfile(userId: number): Promise<User> {
    return toUser(single(await request("GET", `/users/${userId}`)));
  },

  async getUserStats(userId: number): Promise<UserStats> {
    return toUserStats(single(await request("GET", `/users/${userId}/stats`)));
  },


  async createInvite(email: string): Promise<Invite> {
    const body = await request("POST", "/invites", {
      body: resourceBody("inviteToken", { email }),
    });
    // The backend returns `{data: resource}` without the `jsonapi` marker, so
    // the response renderer wraps it once more: `{jsonapi, data: {data: resource}}`.
    return toInvite(flatten(plain<{ data: Resource }>(body).data));
  },

  async listInvites(): Promise<Invite[]> {
    return collection(await request("GET", "/invites")).map(toInvite);
  },

  async revokeInvite(inviteId: number): Promise<void> {
    await request("DELETE", `/invites/${inviteId}`);
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
