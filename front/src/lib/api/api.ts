// @ts-ignore
import { deserialize } from "deserialize-json-api/src";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

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
    try {
        let response: AxiosResponse = await axios.get(endpoint, {
            headers: getHeaders(),
        });
        return deserialize(response.data);
    } catch (error: any) {
        console.error("Error:", error);
        throw error;
    }
}

export async function getRaw(endpoint: string, config?: AxiosRequestConfig) {
    try {
        let response: AxiosResponse = await axios.get(endpoint, {
            ...config,
            headers: {
                ...getHeaders(),
                ...config?.headers,
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error:", error);
        throw error;
    }
}

export async function post(endpoint: string, data: string) {
    let response: AxiosResponse = await axios.post(endpoint, data, {
        headers: getHeaders(),
    });
    return deserialize(response.data);
}

export async function patch(endpoint: string, data: string) {
    let response: AxiosResponse = await axios.patch(endpoint, data, {
        headers: getHeaders(),
    });
    if (response.status >= 200 && response.status < 300) {
        return response;
    }
    // return deserialize(response.data);
}

export async function del(endpoint: string, data: string) {
    let response: AxiosResponse = await axios.delete(`${endpoint}/${data}`, {
        headers: getHeaders(),
    });
    return response;
}