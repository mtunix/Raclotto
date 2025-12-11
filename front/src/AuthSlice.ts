import { create } from "zustand";

interface User {
    id: number;
    name: string;
    email: string;
    meat: boolean;
    vegetarian: boolean;
    vegan: boolean;
    histamine: boolean;
    fructose: boolean;
    lactose: boolean;
    gluten: boolean;
}

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    setToken: (token: string | null) => void;
    setUser: (user: User | null) => void;
    login: (token: string, user: User) => void;
    logout: () => void;
}

// Load from localStorage on init
const loadAuthFromStorage = (): { token: string | null; user: User | null } => {
    try {
        const token = localStorage.getItem("auth_token");
        const userStr = localStorage.getItem("auth_user");
        return {
            token: token || null,
            user: userStr ? JSON.parse(userStr) : null
        };
    } catch {
        return { token: null, user: null };
    }
};

const saveAuthToStorage = (token: string | null, user: User | null) => {
    if (token) {
        localStorage.setItem("auth_token", token);
    } else {
        localStorage.removeItem("auth_token");
    }
    if (user) {
        localStorage.setItem("auth_user", JSON.stringify(user));
    } else {
        localStorage.removeItem("auth_user");
    }
};

const { token: initialToken, user: initialUser } = loadAuthFromStorage();

export const useAuthStore = create<AuthState>((set) => ({
    token: initialToken,
    user: initialUser,
    isAuthenticated: !!initialToken,
    setToken: (token: string | null) => {
        set({ token, isAuthenticated: !!token });
        const state = useAuthStore.getState();
        saveAuthToStorage(token, state.user);
    },
    setUser: (user: User | null) => {
        set({ user });
        const state = useAuthStore.getState();
        saveAuthToStorage(state.token, user);
    },
    login: (token: string, user: User) => {
        set({ token, user, isAuthenticated: true });
        saveAuthToStorage(token, user);
    },
    logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
        saveAuthToStorage(null, null);
    },
}));
