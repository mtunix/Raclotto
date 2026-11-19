import { useGetImageGeneration } from "../api/generated/endpoints/images/images";
import { onErrorRetry } from "../lib/api/swrHooks";

/**
 * Whether the server can generate pictures (it can't without an image model). False until it has
 * said so, so nothing asks for a picture it can't make.
 */
export function useImageGeneration(): boolean {
  const { data } = useGetImageGeneration({
    swr: { onErrorRetry, revalidateIfStale: false, revalidateOnFocus: false, revalidateOnReconnect: false },
  });
  return data?.available === true;
}
