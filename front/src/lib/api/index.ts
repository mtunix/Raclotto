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
import {
  GeneratedProfilePicture,
  ProfilePictureHistory,
} from "../../model/profilePicture";
import { collection, plain, Resource, single } from "./jsonapi";
import {
  toAchievement,
  toEvent,
  toEventConfig,
  toPan,
  toProfilePictureHistory,
  toGeneratedProfilePicture,
} from "./mappers";
import { HttpMethod, RequestOptions, transport } from "./transport";
import { LeaderboardEntry, StatsResponse } from "./types";

function request(method: HttpMethod, path: string, options?: RequestOptions) {
  return transport().request(method, path, options);
}

/** JSON:API request document for a resource of `type`. */
function resourceBody(type: string, attributes: object, id?: number) {
  return { data: id === undefined ? { type, attributes } : { type, id, attributes } };
}

export const Api = {
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
