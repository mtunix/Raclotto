import { useState, useCallback } from "react";
import { postRaw } from "../api/api";

interface UseBananaImageGenerationState {
  loading: boolean;
  error: string | null;
  imageUrl: string | null;
  imageBase64: string | null;
}

interface BananaImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  onError?: (error: Error) => void;
}

/**
 * Hook for generating images using Google Gemini API via backend
 * Converts text prompts into images suitable for profile pictures
 *
 * Note: This hook maintains backward compatibility with the old Banana API interface.
 * Parameters like negativePrompt, width, height, etc. are accepted but ignored by the
 * Gemini API backend, which uses its own defaults.
 *
 * @returns Object with loading state, error, imageUrl, imageBase64, and function to generate image
 */
export function useBananaImageGeneration() {
  const [state, setState] = useState<UseBananaImageGenerationState>({
    loading: false,
    error: null,
    imageUrl: null,
    imageBase64: null,
  });

  const generateImage = useCallback(
    async (options: BananaImageGenerationOptions): Promise<string | null> => {
      const { prompt, onError } = options;
      // Note: Other parameters (negativePrompt, width, height, etc.) are accepted
      // for backward compatibility but are not used with Gemini API

      setState({
        loading: true,
        error: null,
        imageUrl: null,
        imageBase64: null,
      });

      try {
        // Call the backend image generation API using postRaw
        const data = await postRaw("/api/images/generate-banana", {
          prompt,
        });

        // Extract the base64 image from the response
        const imageBase64 = data?.data?.attributes?.imageBase64;

        if (!imageBase64) {
          throw new Error("No image data returned from server");
        }

        const imageUrl = `data:image/png;base64,${imageBase64}`;

        setState({
          loading: false,
          error: null,
          imageUrl,
          imageBase64,
        });

        return imageBase64;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({
          loading: false,
          error: err.message,
          imageUrl: null,
          imageBase64: null,
        });

        if (onError) {
          onError(err);
        }

        return null;
      }
    },
    [],
  );

  const resetState = useCallback(() => {
    setState({
      loading: false,
      error: null,
      imageUrl: null,
      imageBase64: null,
    });
  }, []);

  return {
    ...state,
    generateImage,
    resetState,
  };
}
