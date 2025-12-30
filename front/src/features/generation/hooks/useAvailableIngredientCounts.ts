import useSWR from "swr";
import { useAppStore } from "../../../AppSlice";
import { Api } from "../../../lib/api";

export function useAvailableIngredientCounts() {
  const session = useAppStore((state) => state.session);
  const sessionKey = session?.key;

  // Use SWR to fetch and cache the available counts
  // Only fetch if sessionKey exists and is not empty
  const { data, error, mutate } = useSWR(
    sessionKey ? ["availableCounts", sessionKey] : null,
    sessionKey ? () => Api.getAvailableIngredientCounts(sessionKey) : null,
  );

  // Helper to get available fill count
  const getAvailableFillCount = (defaultValue: number) => {
    // If data has loaded, return the actual API value
    if (data) {
      return data.fill_count;
    }
    // If there's an error or data is loading, return the default from parent
    // If default is 0, use a large number to allow user interaction while loading
    return defaultValue > 0 ? defaultValue : 999;
  };

  // Helper to get available sauce count
  const getAvailableSauceCount = (defaultValue: number) => {
    // If data has loaded, return the actual API value
    if (data) {
      return data.sauce_count;
    }
    // If there's an error or data is loading, return the default from parent
    // If default is 0, use a large number to allow user interaction while loading
    return defaultValue > 0 ? defaultValue : 999;
  };

  // Helper to get total fill count
  const getTotalFillCount = (defaultValue: number) => {
    // If data has loaded, return the actual API value
    if (data) {
      return data.total_fill_count;
    }
    // If there's an error or data is loading, return the default from parent
    return defaultValue > 0 ? defaultValue : 999;
  };

  // Helper to get total sauce count
  const getTotalSauceCount = (defaultValue: number) => {
    // If data has loaded, return the actual API value
    if (data) {
      return data.total_sauce_count;
    }
    // If there's an error or data is loading, return the default from parent
    return defaultValue > 0 ? defaultValue : 999;
  };

  return {
    availableCounts: data,
    isLoading: !error && !data,
    isError: error,
    getAvailableFillCount,
    getAvailableSauceCount,
    getTotalFillCount,
    getTotalSauceCount,
    refresh: () => mutate(),
  };
}
