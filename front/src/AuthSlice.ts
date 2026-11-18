import { create } from "zustand";
import { getMe } from "./api/generated/endpoints/auth/auth";
import type { MeDto } from "./api/generated/model";
import { setAuthHooks } from "./lib/api/transport";

interface AuthState {
  token: string | null;
  user: MeDto | null;
  userId: number | null;
  isAuthenticated: boolean;
  isLoadingUser: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: MeDto | null) => void;
  /** Sign in with what login/register returned; only the token and user id are persisted. */
  login: (token: string, user: MeDto) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

// Load token from localStorage on init
const loadTokenFromStorage = (): string | null => {
  try {
    const token = localStorage.getItem("auth_token");
    return token || null;
  } catch {
    return null;
  }
};

// Load userId from localStorage on init
const loadUserIdFromStorage = (): number | null => {
  try {
    const userIdStr = localStorage.getItem("auth_user_id");
    return userIdStr ? parseInt(userIdStr, 10) : null;
  } catch {
    return null;
  }
};

const saveAuthToStorage = (token: string | null, userId: number | null) => {
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
  if (userId !== null && userId !== undefined) {
    localStorage.setItem("auth_user_id", userId.toString());
  } else {
    localStorage.removeItem("auth_user_id");
  }
};

const initialToken = loadTokenFromStorage();
const initialUserId = loadUserIdFromStorage();

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initialToken,
  user: null,
  userId: initialUserId,
  isAuthenticated: !!initialToken,
  isLoadingUser: false,

  setToken: (token: string | null) => {
    set({ token, isAuthenticated: !!token });
    const state = get();
    saveAuthToStorage(token, state.userId);
  },

  setUser: (user: MeDto | null) => {
    set({ user });
  },

  login: (token: string, user: MeDto) => {
    set({ token, userId: user.id, isAuthenticated: true, user });
    saveAuthToStorage(token, user.id);
  },

  logout: () => {
    set({ token: null, user: null, userId: null, isAuthenticated: false });
    saveAuthToStorage(null, null);
  },

  fetchUser: async () => {
    const state = get();

    // Don't fetch if not authenticated or already loading
    if (!state.token || state.userId === null || state.isLoadingUser) {
      return;
    }

    try {
      set({ isLoadingUser: true });
      const userData = await getMe();
      set({ user: userData, isLoadingUser: false });
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      set({ isLoadingUser: false });
      // On auth error, logout is handled by the transport
    }
  },
}));

setAuthHooks({
  token: () => useAuthStore.getState().token,
  onUnauthorized: () => useAuthStore.getState().logout(),
});
