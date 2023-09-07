// @ts-ignore
import { deserialize } from "deserialize-json-api/src";

const CONTENT_TYPE = "application/vnd.api+json";

function getHeaders() {
    return {
        "Content-Type": CONTENT_TYPE,
        Accept: CONTENT_TYPE,
    };
}

export type JsonApiResponse = {
    data: any;
    jsonapi: {};
    links: {};
    meta: {};
};

export const onErrorRetry = (error: any, key: any, config: any, revalidate: any, { retryCount }: any) => {
    if (error.status === 404) return;

    if (retryCount >= 10) return;

    setTimeout(() => revalidate({ retryCount: retryCount + 1 }), 200 * retryCount);
};

export async function get(endpoint: string) {
    let response = fetch(endpoint, {
        method: "GET",
        headers: getHeaders(),
        mode: "cors",
        cache: "default",
    });

    return await response
        .then((res) => res.json())
        .then((data) => deserialize(data))
        .catch((error: any) => {
            console.error("Error:", error);
        });
}

export async function getRaw(...args: any) {
    // @ts-ignore
    return await fetch(...args, {
        method: "GET",
        headers: getHeaders(),
        mode: "cors",
        cache: "default",
    })
        .then((res) => res.json())
        .then((data) => data)
        .catch((error: any) => {
            console.error("Error:", error);
        });
}

export async function post(endpoint: string, data: string) {
    let response = await fetch(endpoint, {
        method: "POST",
        headers: getHeaders(),
        mode: "cors",
        cache: "default",
        body: data,
    });
    return await response.json().then((data: any) => deserialize(data));
}

export async function patch(endpoint: string, data: string) {
    let response = await fetch(endpoint, {
        method: "PATCH",
        headers: getHeaders(),
        mode: "cors",
        cache: "default",
        body: data,
    })
    if (response?.ok) {
        return response;
    }
    // return await response.json().then((data: any) => deserialize(data));
}

export async function del(endpoint: string, data: string) {
    let response = await fetch(`${endpoint}/${data}`, {
        method: "DELETE",
        headers: getHeaders(),
        mode: "cors",
        cache: "default",
    });
    return response;
}