import useSWR from "swr";
import {get, onErrorRetry} from "./api";
import {RaclottoSession} from "../../model/raclottoSession";

export const ENDPOINT_SESSION = "/api/session";

export const sessionFetcher = (endpoint: string) => get(endpoint)
    .then((response: any) => response.data.map((x: any) => RaclottoSession.fromParsed(x)));

export function useSessions() {
    return useSWR(ENDPOINT_SESSION, sessionFetcher, {
        onErrorRetry: onErrorRetry
    })
}