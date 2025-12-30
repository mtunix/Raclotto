import { create } from "zustand";
import { Api } from "./lib/api";

interface Level {
  id: number;
  name: string;
  required_experience: number;
}

interface NextLevel {
  id: number;
  name: string;
  required_experience: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  meat: boolean;
  vegetarian: boolean;
  vegan: boolean;
  fish: boolean;
  histamine: boolean;
  fructose: boolean;
  lactose: boolean;
  gluten: boolean;
  color?: string;
  profile_picture?: string | null;
  language?: string;
  experience_points?: number;
  level?: Level;
  next_level?: NextLevel;
  border_style?: string;
  border_texture?: string | null;
  glow_effect?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  userId: number | null;
  isAuthenticated: boolean;
  isLoadingUser: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  login: (token: string, userId: number) => void;
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

  setUser: (user: User | null) => {
    set({ user });
  },

  login: (token: string, userId: number) => {
    set({ token, userId, isAuthenticated: true, user: null });
    saveAuthToStorage(token, userId);
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
      const userData = await Api.getCurrentUser();
      set({ user: userData as User, isLoadingUser: false });
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      set({ isLoadingUser: false });
      // On auth error, logout is handled by api.ts
    }
  },
}));
