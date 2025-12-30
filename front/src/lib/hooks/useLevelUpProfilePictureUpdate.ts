import { useState, useCallback } from "react";
import { useGeminiImagePrompt } from "./useGeminiImagePrompt";
import { postRaw } from "../api/api";

export type ProfileUpdateStatus =
  | "idle"
  | "generating-prompt"
  | "generating-image"
  | "completed"
  | "error";

interface UseLevelUpProfilePictureUpdateState {
  status: ProfileUpdateStatus;
  currentStep: string;
  error: string | null;
  generatedImageUrl: string | null;
  generatedImageBase64: string | null;
  progress: number;
  isLoading: boolean;
}

interface LevelUpProfilePictureOptions {
  currentProfileImage?: string | null;
  userLevel: number;
  userName: string;
  onProgress?: (status: string, step: string) => void;
  onError?: (error: Error) => void;
  onSuccess?: (imageUrl: string, imageBase64: string) => void;
}

/**
 * Main hook for updating a user's profile picture upon level up
 *
 * This hook orchestrates the entire flow:
 * 1. Uses Gemini to analyze the current profile picture and generate a creative prompt
 * 2. Calls backend API to generate a new profile picture based on the prompt using Google Gemini
 * 3. Returns the generated image for the application to save
 */
export function useLevelUpProfilePictureUpdate() {
  const [state, setState] = useState<UseLevelUpProfilePictureUpdateState>({
    status: "idle",
    currentStep: "Waiting to start...",
    error: null,
    generatedImageUrl: null,
    generatedImageBase64: null,
    progress: 0,
    isLoading: false,
  });

  const geminiHook = useGeminiImagePrompt();

  const generateNewProfilePicture = useCallback(
    async (options: LevelUpProfilePictureOptions): Promise<string | null> => {
      const {
        currentProfileImage,
        userLevel,
        userName,
        onProgress,
        onError,
        onSuccess,
      } = options;

      try {
        // Reset state
        setState({
          status: "idle",
          currentStep: "Initializing...",
          error: null,
          generatedImageUrl: null,
          generatedImageBase64: null,
          progress: 0,
          isLoading: true,
        });

        // Step 1: Generate prompt using Gemini
        setState({
          status: "generating-prompt",
          currentStep: "Analyzing your profile picture with Gemini AI...",
          error: null,
          generatedImageUrl: null,
          generatedImageBase64: null,
          progress: 20,
          isLoading: true,
        });

        if (onProgress) {
          onProgress(
            "generating-prompt",
            "Analyzing your profile picture with Gemini AI...",
          );
        }

        const generatedPrompt = await geminiHook.generatePrompt({
          currentImageBase64: currentProfileImage || undefined,
          userLevel,
          userName,
          onError: (error) => {
            const err = new Error(`Gemini generation failed: ${error.message}`);
            if (onError) onError(err);
          },
        });

        if (!generatedPrompt) {
          throw new Error(
            geminiHook.error || "Failed to generate prompt from Gemini",
          );
        }

        // Step 2: Generate image using backend API
        setState({
          status: "generating-image",
          currentStep:
            "Generating your new profile picture with Google Gemini...",
          error: null,
          generatedImageUrl: null,
          generatedImageBase64: null,
          progress: 40,
          isLoading: true,
        });

        if (onProgress) {
          onProgress(
            "generating-image",
            "Generating your new profile picture with Google Gemini...",
          );
        }

        // Update progress more frequently during image generation
        const progressInterval = setInterval(() => {
          setState((prevState) => ({
            ...prevState,
            progress: Math.min(prevState.progress + 5, 90),
          }));
        }, 2000);

        // Call the backend image generation API using postRaw
        const data = await postRaw("/api/images/generate-banana", {
          prompt: generatedPrompt,
        });

        clearInterval(progressInterval);

        const imageBase64 = data?.data?.attributes?.imageBase64;

        if (!imageBase64) {
          throw new Error("No image data returned from server");
        }

        // Step 3: Complete
        const imageUrl = `data:image/png;base64,${imageBase64}`;

        setState({
          status: "completed",
          currentStep: "Your new profile picture is ready! Saving...",
          error: null,
          generatedImageUrl: imageUrl,
          generatedImageBase64: imageBase64,
          progress: 100,
          isLoading: false,
        });

        if (onProgress) {
          onProgress(
            "completed",
            "Your new profile picture is ready! Saving...",
          );
        }

        if (onSuccess) {
          onSuccess(imageUrl, imageBase64);
        }

        return imageBase64;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        setState({
          status: "error",
          currentStep: `Error: ${err.message}`,
          error: err.message,
          generatedImageUrl: null,
          generatedImageBase64: null,
          progress: 0,
          isLoading: false,
        });

        if (onError && error instanceof Error) {
          onError(error);
        }

        return null;
      }
    },
    [geminiHook],
  );

  const reset = useCallback(() => {
    setState({
      status: "idle",
      currentStep: "Waiting to start...",
      error: null,
      generatedImageUrl: null,
      generatedImageBase64: null,
      progress: 0,
      isLoading: false,
    });
    geminiHook.resetState();
  }, [geminiHook]);

  return {
    ...state,
    generateNewProfilePicture,
    reset,
  };
}
