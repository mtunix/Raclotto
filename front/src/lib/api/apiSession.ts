import useSWR from "swr";
import {get, onErrorRetry} from "./api";
import {RaclottoSession} from "../../model/raclottoSession";
import { DeserializedResponse } from "./types";

export const ENDPOINT_SESSION = "/api/sessions";

export const sessionFetcher = (endpoint: string) => get(endpoint)
    .then((response: DeserializedResponse<unknown>) => {
        const data = response.data;
        if (Array.isArray(data)) {
            return data.map((x: unknown) => RaclottoSession.fromParsed(x as { id: number; key: string; name: string; timestamp: Date | string; active: boolean }));
        }
        return [];
    });

export function useSessions(includeInactive: boolean = false) {
    const endpoint = includeInactive ? `${ENDPOINT_SESSION}?include_inactive=true` : ENDPOINT_SESSION;
    return useSWR(endpoint, sessionFetcher, {
        onErrorRetry: onErrorRetry
    })
}