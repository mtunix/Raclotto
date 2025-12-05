import { get, post, del } from "./api";
import { Ingredient } from "../../model/ingredient";

const API_BASE = "/api";

export class Api {
    static async get(resource: string, session?: string): Promise<any> {
        let endpoint = `${API_BASE}/${resource}`;
        if (session) {
            endpoint += `?session_key=${session}`;
        }
        const response = await get(endpoint);
        // Handle both array and object responses
        if (Array.isArray(response.data)) {
            return response.data;
        } else if (response.data) {
            return response.data;
        }
        return response;
    }

    static async add(session: string, data: any): Promise<any> {
        const endpoint = `${API_BASE}/ingredients`;
        const jsonApiData = {
            data: {
                type: "ingredient",
                attributes: data
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        return response.data || response;
    }

    static async delete(session: string, item: any): Promise<any> {
        const endpoint = `${API_BASE}/${this.getResourceType(item)}/${item.id}?session_key=${session}`;
        const response = await del(endpoint, "");
        return response;
    }

    static async refill(session: string, ingredient: Ingredient): Promise<any> {
        const endpoint = `${API_BASE}/ingredients/refill`;
        const jsonApiData = {
            data: {
                type: "ingredient",
                id: ingredient.id,
                attributes: {}
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        return response.data || response;
    }

    static async generate(session: string, numFill: number, numSauce: number): Promise<any> {
        const endpoint = `${API_BASE}/pan/generate?session_key=${session}`;
        const jsonApiData = {
            data: {
                type: "generationParameters",
                attributes: {
                    numFill: numFill,
                    numSauce: numSauce
                }
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        return response.data || response;
    }

    static async rate(session: string, panId: number, rating: number): Promise<any> {
        const endpoint = `${API_BASE}/ratings`;
        const jsonApiData = {
            data: {
                type: "rating",
                attributes: {
                    panId: panId,
                    rating: rating
                }
            }
        };
        const response = await post(endpoint, JSON.stringify(jsonApiData));
        return response.data || response;
    }

    static async close(session: string): Promise<any> {
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
        return response.data || response;
    }

    private static getResourceType(item: any): string {
        if (item.type !== undefined) {
            return "ingredients";
        }
        return "ingredients"; // default
    }
}

