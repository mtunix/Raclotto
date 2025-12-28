import { get, post, patch, del, getHeaders } from "./api";
import axios from "axios";
import { Ingredient, IngredientType } from "../../model/ingredient";
import { PrepType } from "../../model/prepType";
import { RaclottoSession } from "../../model/raclottoSession";
import { Pan } from "../../model/pan";
import { Event } from "../../model/event";
import { EventConfig } from "../../model/eventConfig";
import { AxiosResponse } from "axios";
import { 
    GenerationResponse,
    RatingResponse,
    SessionResponse,
    ApiResponse,
    StatsResponse,
    LeaderboardEntry
} from "./types";

const API_BASE = "/api";

export class Api {
    static async get(resource: string, session?: string): Promise<ApiResponse<unknown>> {
        let endpoint = `${API_BASE}/${resource}`;
        if (session) {
            endpoint += `?session_key=${session}`;
        }
        const response = await get(endpoint);
        
        // The deserialize-json-api library returns { data: [...] } where data is an array
        // Each item in the array has attributes flattened, but we need to check the structure
        if (response && response.data) {
            if (Array.isArray(response.data)) {
                // Data is already an array (deserialized and flattened)
                return response.data;
            } else if (typeof response.data === 'object') {
                // Might be a single object or nested structure
                return response.data;
            }
        }
        
        // Fallback: return the whole response
        return response;
    }
    
    static async getSessionByKey(sessionKey: string): Promise<RaclottoSession> {
        const endpoint = `${API_BASE}/sessions/by-key?session_key=${sessionKey}`;
        const response = await get(endpoint);
        if (response.data && typeof response.data === 'object') {
            const sessionData = response.data as { id?: number; attributes?: any; key?: string; name?: string; timestamp?: string; active?: boolean };
            const attrs = sessionData.attributes || sessionData;
            return RaclottoSession.fromParsed({
                id: sessionData.id || (attrs as any).id || 0,
                key: (attrs as any).key || sessionKey,
                name: (attrs as any).name || '',
                timestamp: (attrs as any).timestamp ? new Date((attrs as any).timestamp) : new Date(),
                active: (attrs as any).active !== undefined ? (attrs as any).active : true
            });
        }
        throw new Error("Invalid session response");
    }
    
    static async updateSession(sessionId: number, name: string): Promise<RaclottoSession> {
        const endpoint = `${API_BASE}/sessions/${sessionId}`;
        const jsonApiData = {
            data: {
                type: "session",
                attributes: {
                    name: name
                }
            }
        };
        const response = await patch(endpoint, JSON.stringify(jsonApiData));
        if (response.data && typeof response.data === 'object') {
            const sessionData = response.data as { id?: number; attributes?: any; key?: string; name?: string; timestamp?: string; active?: boolean };
            const attrs = sessionData.attributes || sessionData;
            return RaclottoSession.fromParsed({
                id: sessionData.id || sessionId,
                key: (attrs as any).key || '',
                name: (attrs as any).name || name,
                timestamp: (attrs as any).timestamp ? new Date((attrs as any).timestamp) : new Date(),
                active: (attrs as any).active !== undefined ? (attrs as any).active : true
            });
        }
        throw new Error("Invalid session update response");
    }

    static async add(session: string, data: Omit<Ingredient, "id" | "available">, resourceType: string = "ingredient"): Promise<Ingredient | PrepType> {
        const endpoint = resourceType === "preparation_type" 
            ? `${API_BASE}/preparation_type?session_key=${session}`
            : `${API_BASE}/ingredients`;
        const jsonApiData = {
            data: {
                type: resourceType,
                attributes: resourceType === "preparation_type" 
                    ? data
                    : {
                        ...data,
                        session_key: session
                    }
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        if (response.data && typeof response.data === 'object') {
            return response.data as Ingredient | PrepType;
        }
        throw new Error(`Invalid ${resourceType} creation response`);
    }

    static async delete(session: string, item: Ingredient | PrepType | { type?: IngredientType; name?: string; id: number }): Promise<AxiosResponse> {
        const resourceType = this.getResourceType(item);
        // For preparation_type, don't include session_key in query params (not needed for deletion)
        const endpoint = resourceType === "preparation_type"
            ? `${API_BASE}/${resourceType}/${item.id}`
            : `${API_BASE}/${resourceType}/${item.id}?session_key=${session}`;
        const response = await del(endpoint);
        return response;
    }

    static async refill(session: string, ingredient: Ingredient): Promise<Ingredient> {
        const endpoint = `${API_BASE}/ingredients/refill`;
        const jsonApiData = {
            data: {
                type: "ingredient",
                id: ingredient.id,
                attributes: {}
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        if (response.data && typeof response.data === 'object') {
            return response.data as Ingredient;
        }
        throw new Error("Invalid ingredient refill response");
    }

    static async updateIngredient(ingredientId: number, data: Partial<Ingredient>): Promise<Ingredient> {
        const endpoint = `${API_BASE}/ingredients/${ingredientId}`;
        const jsonApiData = {
            data: {
                type: "ingredient",
                id: ingredientId,
                attributes: data
            }
        };
        const response = await patch(endpoint, JSON.stringify(jsonApiData));
        if (response.data && typeof response.data === 'object') {
            const responseData = response.data as { data?: { attributes?: any; id?: number } };
            if (responseData.data && responseData.data.attributes) {
                return { ...responseData.data.attributes, id: responseData.data.id || ingredientId } as Ingredient;
            }
            return response.data as Ingredient;
        }
        throw new Error("Invalid ingredient update response");
    }

    static async generate(session: string, numFill: number, numSauce: number, preparationTypeId?: number, rollCheese?: boolean): Promise<GenerationResponse> {
        const endpoint = `${API_BASE}/pans/generate?session_key=${session}`;
        const attributes: any = {
            numFill: numFill,
            numSauce: numSauce
        };
        if (preparationTypeId) {
            attributes.preparation_type_id = preparationTypeId;
        }
        if (rollCheese !== undefined) {
            attributes.roll_cheese = rollCheese;
        }
        const jsonApiData = {
            data: {
                type: "generationParameters",
                attributes: attributes
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        // The backend returns a pan directly after deserialization
        // Extract achievements from meta if present
        let achievements: any[] = [];
        if (response && response.meta && (response.meta as any).newly_unlocked_achievements) {
            const achievementData = (response.meta as any).newly_unlocked_achievements;
            if (Array.isArray(achievementData)) {
                achievements = achievementData.map((item: any) => ({
                    id: item.id ? (typeof item.id === 'string' ? parseInt(item.id, 10) : Number(item.id)) : (item.attributes?.id || 0),
                    title: item.attributes?.title || item.title || '',
                    description: item.attributes?.description || item.description || '',
                    value: item.attributes?.value !== undefined ? item.attributes.value : (item.value !== undefined ? item.value : 0),
                    hidden: item.attributes?.hidden !== undefined ? item.attributes.hidden : (item.hidden !== undefined ? item.hidden : false),
                }));
            }
        }
        // Wrap it in the expected GenerationResponse format
        if (response.data && typeof response.data === 'object') {
            const pan = response.data as Pan;
            return { generated: pan, achievements };
        }
        throw new Error("Invalid generation response");
    }

    static async generateBandit(session: string, totalColumns: number, rollPrepType: boolean, rollCheese?: boolean): Promise<GenerationResponse> {
        const endpoint = `${API_BASE}/pans/generate/bandit?session_key=${session}`;
        const attributes: any = {
            total_columns: totalColumns,
            roll_prep_type: rollPrepType
        };
        if (rollCheese !== undefined) {
            attributes.roll_cheese = rollCheese;
        }
        const jsonApiData = {
            data: {
                type: "generationParameters",
                attributes: attributes
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        // The backend returns a pan directly after deserialization
        // Extract achievements from meta if present
        let achievements: any[] = [];
        if (response && response.meta && (response.meta as any).newly_unlocked_achievements) {
            const achievementData = (response.meta as any).newly_unlocked_achievements;
            if (Array.isArray(achievementData)) {
                achievements = achievementData.map((item: any) => ({
                    id: item.id ? (typeof item.id === 'string' ? parseInt(item.id, 10) : Number(item.id)) : (item.attributes?.id || 0),
                    title: item.attributes?.title || item.title || '',
                    description: item.attributes?.description || item.description || '',
                    value: item.attributes?.value !== undefined ? item.attributes.value : (item.value !== undefined ? item.value : 0),
                    hidden: item.attributes?.hidden !== undefined ? item.attributes.hidden : (item.hidden !== undefined ? item.hidden : false),
                }));
            }
        }
        // Wrap it in the expected GenerationResponse format
        if (response.data && typeof response.data === 'object') {
            const pan = response.data as Pan;
            return { generated: pan, achievements };
        }
        throw new Error("Invalid bandit generation response");
    }
    
    static async getPansPaginated(session: string, limit: number = 12, offset: number = 0): Promise<{ data: Pan[]; hasMore: boolean; total: number }> {
        const endpoint = `${API_BASE}/pans?session_key=${session}&limit=${limit}&offset=${offset}`;
        const response = await get(endpoint);
        
        // Handle deserialized response
        let dataArray: any[] = [];
        if (Array.isArray(response.data)) {
            dataArray = response.data;
        } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            const nestedData = (response.data as { data: any }).data;
            if (Array.isArray(nestedData)) {
                dataArray = nestedData;
            }
        } else if (Array.isArray(response)) {
            dataArray = response;
        }
        
        const pans = dataArray.map((item: any) => {
            const attributes = item.attributes || item;
            return {
                id: item.id ? (typeof item.id === 'string' ? parseInt(item.id, 10) : Number(item.id)) : attributes.id,
                name: attributes.name || item.name,
                timestamp: attributes.timestamp || item.timestamp,
                user: attributes.user || item.user,
                user_color: attributes.user_color || item.user_color,
                user_id: attributes.user_id !== undefined ? (typeof attributes.user_id === 'string' ? parseInt(attributes.user_id, 10) : Number(attributes.user_id)) : item.user_id,
                user_profile_picture: attributes.user_profile_picture || item.user_profile_picture,
                user_border_style: attributes.user_border_style || item.user_border_style,
                user_border_texture: attributes.user_border_texture !== undefined ? attributes.user_border_texture : item.user_border_texture,
                user_glow_effect: attributes.user_glow_effect !== undefined ? attributes.user_glow_effect : (item.user_glow_effect !== undefined ? item.user_glow_effect : false),
                ingredients: attributes.ingredients || item.ingredients || [],
                ratings: attributes.ratings || item.ratings || [],
                rating: attributes.rating !== undefined ? attributes.rating : (item.rating !== undefined ? item.rating : 0)
            } as Pan;
        });
        
        // Extract pagination metadata
        const meta = (response as any).meta || {};
        const hasMore = meta.has_more !== undefined ? meta.has_more : (offset + pans.length < (meta.total || 0));
        const total = meta.total || 0;
        
        return {
            data: pans,
            hasMore: hasMore,
            total: total
        };
    }

    static async getPansByUser(userId: number, limit: number = 12, offset: number = 0): Promise<{ data: Pan[]; hasMore: boolean; total: number }> {
        const endpoint = `${API_BASE}/pans?user_id=${userId}&limit=${limit}&offset=${offset}`;
        const response = await get(endpoint);
        
        // Handle deserialized response
        let dataArray: any[] = [];
        if (Array.isArray(response.data)) {
            dataArray = response.data;
        } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            const nestedData = (response.data as { data: any }).data;
            if (Array.isArray(nestedData)) {
                dataArray = nestedData;
            }
        } else if (Array.isArray(response)) {
            dataArray = response;
        }
        
        const pans = dataArray.map((item: any) => {
            const attributes = item.attributes || item;
            return {
                id: item.id ? (typeof item.id === 'string' ? parseInt(item.id, 10) : Number(item.id)) : attributes.id,
                name: attributes.name || item.name,
                timestamp: attributes.timestamp || item.timestamp,
                user: attributes.user || item.user,
                user_color: attributes.user_color || item.user_color,
                user_id: attributes.user_id !== undefined ? (typeof attributes.user_id === 'string' ? parseInt(attributes.user_id, 10) : Number(attributes.user_id)) : item.user_id,
                user_profile_picture: attributes.user_profile_picture || item.user_profile_picture,
                user_border_style: attributes.user_border_style || item.user_border_style,
                user_border_texture: attributes.user_border_texture !== undefined ? attributes.user_border_texture : item.user_border_texture,
                user_glow_effect: attributes.user_glow_effect !== undefined ? attributes.user_glow_effect : (item.user_glow_effect !== undefined ? item.user_glow_effect : false),
                ingredients: attributes.ingredients || item.ingredients || [],
                ratings: attributes.ratings || item.ratings || [],
                rating: attributes.rating !== undefined ? attributes.rating : (item.rating !== undefined ? item.rating : 0)
            } as Pan;
        });
        
        // Extract pagination metadata
        const meta = (response as any).meta || {};
        const hasMore = meta.has_more !== undefined ? meta.has_more : (offset + pans.length < (meta.total || 0));
        const total = meta.total || 0;
        
        return {
            data: pans,
            hasMore: hasMore,
            total: total
        };
    }

    static async clonePan(session: string, pan: Pan): Promise<Pan> {
        const endpoint = `${API_BASE}/pans?session_key=${session}`;
        const jsonApiData = {
            data: {
                type: "pan",
                attributes: {
                    name: pan.name,
                    ingredients: pan.ingredients.map(ing => ing.id)
                }
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        if (response.data && typeof response.data === 'object') {
            return response.data as Pan;
        }
        throw new Error("Invalid pan clone response");
    }

    static async rate(session: string, panId: number, rating: number): Promise<RatingResponse> {
        const endpoint = `${API_BASE}/ratings?session_key=${session}`;
        const jsonApiData = {
            data: {
                type: "rating",
                attributes: {
                    pan_id: panId,
                    rating: rating
                }
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        if (response.data && typeof response.data === 'object') {
            return response.data as RatingResponse;
        }
        throw new Error("Invalid rating response");
    }

    static async createSession(name: string): Promise<RaclottoSession> {
        const endpoint = `${API_BASE}/sessions`;
        const jsonApiData = {
            data: {
                type: "session",
                attributes: {
                    name: name
                }
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        // Response should have session data
        if (response.data && typeof response.data === 'object') {
            const sessionData = response.data as { id?: number; attributes?: any; key?: string; name?: string; timestamp?: string; active?: boolean };
            const attrs = sessionData.attributes || sessionData;
            return RaclottoSession.fromParsed({
                id: sessionData.id || (attrs as any).id || 0,
                key: (attrs as any).key || '',
                name: (attrs as any).name || name,
                timestamp: (attrs as any).timestamp ? new Date((attrs as any).timestamp) : new Date(),
                active: (attrs as any).active !== undefined ? (attrs as any).active : true
            });
        }
        throw new Error("Invalid session creation response");
    }

    static async close(session: string): Promise<SessionResponse> {
        const endpoint = `${API_BASE}/sessions/close`;
        const jsonApiData = {
            data: {
                type: "session",
                attributes: {
                    key: session
                }
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        if (response.data && typeof response.data === 'object') {
            return response.data as SessionResponse;
        }
        throw new Error("Invalid session close response");
    }

    static async reactivateSession(session: string): Promise<RaclottoSession> {
        const endpoint = `${API_BASE}/sessions/reactivate`;
        const jsonApiData = {
            data: {
                type: "session",
                attributes: {
                    key: session
                }
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        if (response.data && typeof response.data === 'object') {
            const sessionData = response.data as { id?: number; attributes?: any; key?: string; name?: string; timestamp?: string; active?: boolean };
            const attrs = sessionData.attributes || sessionData;
            return RaclottoSession.fromParsed({
                id: sessionData.id || (attrs as any).id || 0,
                key: (attrs as any).key || session,
                name: (attrs as any).name || '',
                timestamp: (attrs as any).timestamp ? new Date((attrs as any).timestamp) : new Date(),
                active: (attrs as any).active !== undefined ? (attrs as any).active : true
            });
        }
        throw new Error("Invalid session reactivate response");
    }

    static async getStats(session?: string): Promise<StatsResponse> {
        let endpoint = `${API_BASE}/stats`;
        if (session) {
            endpoint += `?session_key=${session}`;
        }
        const response = await get(endpoint);
        if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
            return response.data as StatsResponse;
        }
        throw new Error("Invalid stats response");
    }

    static async login(emailOrName: string, password: string): Promise<{ token: string; user: any }> {
        const endpoint = `${API_BASE}/auth/login`;
        const jsonApiData = {
            data: {
                type: "login",
                attributes: {
                    email: emailOrName,
                    password: password
                }
            }
        };
        // Use axios directly to preserve meta field
        const response = await axios.post(endpoint, jsonApiData, {
            headers: getHeaders()
        });
        if (response.data && response.data.data && response.data.meta && response.data.meta.token) {
            const userData = response.data.data as { id: number; attributes: any };
            return {
                token: response.data.meta.token as string,
                user: userData.attributes
            };
        }
        throw new Error("Invalid login response");
    }

    static async register(token: string, email: string, name: string, password: string, profile_picture?: string): Promise<{ token: string; user: any }> {
        const endpoint = `${API_BASE}/auth/register`;
        const attributes: any = {
            token: token,
            email: email,
            name: name,
            password: password
        };
        if (profile_picture) {
            attributes.profile_picture = profile_picture;
        }
        const jsonApiData = {
            data: {
                type: "register",
                attributes: attributes
            }
        };
        // Use axios directly to preserve meta field
        const response = await axios.post(endpoint, jsonApiData, {
            headers: getHeaders()
        });
        if (response.data && response.data.data && response.data.meta && response.data.meta.token) {
            const userData = response.data.data as { id: number; attributes: any };
            return {
                token: response.data.meta.token as string,
                user: userData.attributes
            };
        }
        throw new Error("Invalid registration response");
    }

    static async getInviteByToken(token: string): Promise<{ token: string; email: string; expires_at?: string; is_used?: boolean }> {
        const endpoint = `${API_BASE}/auth/invite/${encodeURIComponent(token)}`;
        const response = await get(endpoint);

        // After deserialization, attributes are typically flattened into data,
        // but we also support a nested attributes structure.
        if (response && response.data && typeof response.data === "object") {
            const data = response.data as any;
            if (data.attributes && typeof data.attributes === "object") {
                return data.attributes as { token: string; email: string; expires_at?: string; is_used?: boolean };
            }
            return data as { token: string; email: string; expires_at?: string; is_used?: boolean };
        }

        throw new Error("Invalid invite lookup response");
    }

    static async getCurrentUser(): Promise<any> {
        const endpoint = `${API_BASE}/auth/me`;
        try {
            const response = await get(endpoint);
            // After deserialization, attributes are flattened into data
            if (response && response.data && typeof response.data === 'object') {
                // Handle both flattened and nested attribute structures
                const data = response.data as any;
                if (data.attributes && typeof data.attributes === 'object') {
                    // Attributes are nested, flatten them
                    return { ...data.attributes, id: data.id };
                }
                // Attributes are already flattened
                return data;
            }
            console.error("Invalid user response structure:", response);
            throw new Error("Invalid user response: missing or invalid data");
        } catch (error) {
            console.error("Error fetching current user:", error);
            throw error;
        }
    }

    static async updateCurrentUser(attributes: {
        name?: string;
        meat?: boolean;
        vegetarian?: boolean;
        vegan?: boolean;
        fish?: boolean;
        histamine?: boolean;
        fructose?: boolean;
        lactose?: boolean;
        gluten?: boolean;
        color?: string;
        profile_picture?: string | null;
        language?: string;
    }): Promise<any> {
        const endpoint = `${API_BASE}/auth/me`;
        const jsonApiData = {
            data: {
                type: "user",
                attributes: attributes
            }
        };
        const response = await patch(endpoint, JSON.stringify(jsonApiData));
        // After deserialization, attributes are flattened into data
        if (response.data && typeof response.data === 'object') {
            return response.data;
        }
        throw new Error("Invalid user update response");
    }
    
    static async getAvailableIngredientCounts(session: string): Promise<{fill_count: number; sauce_count: number}> {
        const endpoint = `${API_BASE}/ingredients/available-counts?session_key=${session}`;
        const response = await get(endpoint);
        if (response.data && typeof response.data === 'object') {
            const data = response.data as { fill_count?: number; sauce_count?: number };
            return {
                fill_count: data.fill_count || 0,
                sauce_count: data.sauce_count || 0
            };
        }
        throw new Error("Invalid available counts response");
    }

    static async refreshToken(): Promise<string> {
        const endpoint = `${API_BASE}/auth/refresh`;
        const response = await axios.post(endpoint, { data: { type: "refresh", attributes: {} } }, {
            headers: getHeaders()
        });
        if (response.data && response.data.data && typeof response.data.data === 'object' && 'attributes' in response.data.data) {
            const tokenData = response.data.data as { attributes: { token: string } };
            return tokenData.attributes.token;
        }
        throw new Error("Invalid refresh response");
    }

    static async getUserProfile(userId: number): Promise<any> {
        const endpoint = `${API_BASE}/users/${userId}`;
        try {
            const response = await get(endpoint);
            if (response && response.data && typeof response.data === 'object') {
                return response.data;
            }
            console.error("Invalid user profile response structure:", response);
            throw new Error("Invalid user profile response: missing or invalid data");
        } catch (error) {
            console.error("Error fetching user profile:", error);
            throw error;
        }
    }

    static async getUserStats(userId: number): Promise<any> {
        const endpoint = `${API_BASE}/users/${userId}/stats`;
        try {
            const response = await get(endpoint);
            if (response && response.data && typeof response.data === 'object') {
                const data = response.data as { attributes?: any };
                return data.attributes || data;
            }
            throw new Error("Invalid user stats response");
        } catch (error) {
            console.error("Error fetching user stats:", error);
            throw error;
        }
    }

    static async createInvite(email: string): Promise<any> {
        const endpoint = `${API_BASE}/invites`;
        const jsonApiData = {
            data: {
                type: "inviteToken",
                attributes: {
                    email: email
                }
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        // Backend returns JSON API format: { data: { type, id, attributes: {...} } }
        if (response.data && typeof response.data === 'object') {
            const data = response.data as { data?: { attributes?: any }; attributes?: any };
            // Check if it's JSON API format (nested data.attributes)
            if (data.data && data.data.attributes) {
                return data.data.attributes;
            }
            // Fallback to direct attributes
            if ('attributes' in data) {
                return (data as { attributes: any }).attributes;
            }
            // If it's already the attributes object
            return data;
        }
        throw new Error("Invalid invite creation response");
    }

    static async listInvites(): Promise<any[]> {
        const endpoint = `${API_BASE}/invites`;
        const response = await get(endpoint);
        
        // The deserialize-json-api library flattens attributes
        // response.data should be an array after deserialization
        let dataArray: any[] = [];
        
        if (Array.isArray(response.data)) {
            dataArray = response.data;
        } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            // Nested data structure
            const nestedData = (response.data as { data: any }).data;
            if (Array.isArray(nestedData)) {
                dataArray = nestedData;
            }
        }
        
        // Map items to the expected format
        return dataArray.map((item: any) => {
            if (typeof item !== 'object' || item === null) {
                return item;
            }
            
            // Handle both flattened and nested attribute structures
            // The deserialize-json-api library flattens attributes, so we check both locations
            const attributes = item.attributes || {};
            const id = item.id || attributes.id;
            
            // Extract all fields, preferring top-level if exists (flattened), otherwise from attributes
            const result: any = {
                id: id ? (typeof id === 'string' ? parseInt(id, 10) : Number(id)) : undefined,
                token: item.token !== undefined ? item.token : attributes.token,
                email: item.email !== undefined ? item.email : attributes.email,
                expires_at: item.expires_at !== undefined ? item.expires_at : attributes.expires_at,
                is_used: item.is_used !== undefined ? item.is_used : (attributes.is_used !== undefined ? attributes.is_used : false),
                used_at: item.used_at !== undefined ? item.used_at : (attributes.used_at || null)
            };
            
            return result;
        });
    }

    static async revokeInvite(inviteId: number): Promise<void> {
        const endpoint = `${API_BASE}/invites/${inviteId}`;
        await del(endpoint);
    }

    private static getResourceType(item: Ingredient | PrepType | { type?: IngredientType; name?: string; id: number }): string {
        // Ingredient has 'available' property (boolean), PrepType doesn't
        if ('available' in item && typeof (item as any).available === 'boolean') {
            return "ingredients";
        }
        // PrepType has 'session_id' property (number | null | undefined), Ingredient doesn't
        if ('session_id' in item) {
            return "preparation_type";
        }
        // Fallback: check for IngredientType enum (Ingredient has it with values 1 or 2, PrepType doesn't)
        if ('type' in item && typeof (item as any).type === 'number') {
            const typeValue = (item as any).type;
            if (typeValue === 1 || typeValue === 2) {
                return "ingredients";
            }
        }
        // If it has 'name' but no 'available' and no IngredientType 'type', assume prep type
        if ('name' in item && !('available' in item)) {
            return "preparation_type";
        }
        // Default fallback
        return "ingredients";
    }

    // Ingredient import/export/reimport methods
    static async exportIngredients(sessionKey: string): Promise<{ session_key: string; session_id: number; ingredients: any[] }> {
        const endpoint = `${API_BASE}/ingredients/export?session_key=${sessionKey}`;
        const response = await get(endpoint);
        const data = response.data || response;
        return data as { session_key: string; session_id: number; ingredients: any[] };
    }

    static async importIngredients(sessionKey: string, ingredients: any[]): Promise<{ created: number; ingredients: any[] }> {
        const endpoint = `${API_BASE}/ingredients/import?session_key=${sessionKey}`;
        const response = await post(endpoint, JSON.stringify({ ingredients }));
        const data = response.data || response;
        return data as { created: number; ingredients: any[] };
    }

    static async reimportIngredients(sessionKey: string, ingredients: any[]): Promise<{ created: number; updated: number; deleted: number; ingredients: any[] }> {
        const endpoint = `${API_BASE}/ingredients/reimport?session_key=${sessionKey}`;
        const response = await post(endpoint, JSON.stringify({ ingredients }));
        const data = response.data || response;
        return data as { created: number; updated: number; deleted: number; ingredients: any[] };
    }

    static async getLeaderboard(): Promise<LeaderboardEntry[]> {
        const endpoint = `${API_BASE}/achievements/leaderboard`;
        const response = await get(endpoint) as { data?: unknown };
        
        // The deserialize-json-api library flattens attributes
        // response.data should be an array after deserialization
        if (response && response.data) {
            if (Array.isArray(response.data)) {
                return response.data as LeaderboardEntry[];
            } else if (typeof response.data === 'object' && response.data !== null) {
                // Handle nested data structure
                const nestedData = (response.data as { data?: unknown }).data;
                if (Array.isArray(nestedData)) {
                    return nestedData as LeaderboardEntry[];
                }
            }
        }
        
        return [];
    }

    // Event API methods
    static async getEvents(sessionKey: string): Promise<Event[]> {
        const endpoint = `${API_BASE}/events?session_key=${sessionKey}`;
        const response = await get(endpoint);
        
        // Handle deserialized response
        let dataArray: any[] = [];
        if (Array.isArray(response.data)) {
            dataArray = response.data;
        } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            const nestedData = (response.data as { data: any }).data;
            if (Array.isArray(nestedData)) {
                dataArray = nestedData;
            }
        } else if (Array.isArray(response)) {
            dataArray = response;
        }
        
        return dataArray.map((item: any) => {
            const attributes = item.attributes || {};
            return {
                id: item.id ? (typeof item.id === 'string' ? parseInt(item.id, 10) : Number(item.id)) : attributes.id,
                event_type: item.event_type !== undefined ? item.event_type : attributes.event_type,
                message: item.message !== undefined ? item.message : attributes.message,
                data: item.data !== undefined ? item.data : attributes.data,
                created_at: item.created_at !== undefined ? item.created_at : attributes.created_at
            };
        });
    }

    static async dismissEvent(eventId: number): Promise<void> {
        const endpoint = `${API_BASE}/events/${eventId}/dismiss`;
        await post(endpoint, JSON.stringify({}));
    }

    static async getEventConfigs(sessionKey?: string): Promise<EventConfig[]> {
        const endpoint = sessionKey 
            ? `${API_BASE}/events/configs?session_key=${sessionKey}`
            : `${API_BASE}/events/configs`;
        const response = await get(endpoint);
        
        // Handle deserialized response
        let dataArray: any[] = [];
        if (Array.isArray(response.data)) {
            dataArray = response.data;
        } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            const nestedData = (response.data as { data: any }).data;
            if (Array.isArray(nestedData)) {
                dataArray = nestedData;
            }
        } else if (Array.isArray(response)) {
            dataArray = response;
        }
        
        return dataArray.map((item: any) => {
            const attributes = item.attributes || {};
            return {
                id: item.id ? (typeof item.id === 'string' ? parseInt(item.id, 10) : Number(item.id)) : attributes.id,
                event_type: item.event_type !== undefined ? item.event_type : attributes.event_type,
                session_id: item.session_id !== undefined ? item.session_id : (attributes.session_id !== undefined ? attributes.session_id : null),
                enabled: item.enabled !== undefined ? item.enabled : attributes.enabled,
                frequency_minutes: item.frequency_minutes !== undefined ? item.frequency_minutes : (attributes.frequency_minutes !== undefined ? attributes.frequency_minutes : null)
            };
        });
    }

    static async updateEventConfig(config: { event_type: string; enabled: boolean; frequency_minutes?: number | null; session_key?: string }): Promise<EventConfig> {
        const endpoint = `${API_BASE}/events/configs`;
        const jsonApiData = {
            data: {
                type: "event_config",
                attributes: config
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        const data = response.data || response;
        const attributes = (data as any).attributes || data;
        return {
            id: (data as any).id ? (typeof (data as any).id === 'string' ? parseInt((data as any).id, 10) : Number((data as any).id)) : attributes.id,
            event_type: attributes.event_type,
            session_id: attributes.session_id !== undefined ? attributes.session_id : null,
            enabled: attributes.enabled,
            frequency_minutes: attributes.frequency_minutes !== undefined ? attributes.frequency_minutes : null
        };
    }
}

