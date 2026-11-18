import useSWR from "swr";
import { Api } from "./index";
import { onErrorRetry } from "./swrHooks";

export const ENDPOINT_SESSION = "/api/sessions";

export const sessionFetcher = ([, includeInactive]: [string, boolean]) =>
    Api.listSessions(includeInactive);

export function useSessions(includeInactive: boolean = false) {
    return useSWR([ENDPOINT_SESSION, includeInactive], sessionFetcher, {
        onErrorRetry: onErrorRetry
    })
}
