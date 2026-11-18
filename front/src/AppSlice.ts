import { create } from "zustand";
import { RaclottoSession } from "./model/raclottoSession";
import { Achievement } from "./model/achievement";

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

interface XpNotificationState {
    visible: boolean;
    xpGained: number;
    oldXP: number;
    newXP: number;
    level: Level | null;
    nextLevel: NextLevel | null;
    levelUp: boolean;
    achievements: Achievement[];
}

interface AppState {
    session: RaclottoSession | null;
    setSession: (session: RaclottoSession) => void;
    clearSession: () => void;
    settingsRefreshTrigger: number;
    triggerSettingsRefresh: () => void;
    removeWidthCap: boolean;
    setRemoveWidthCap: (remove: boolean) => void;
    xpNotification: XpNotificationState;
    showXpNotification: (xpGained: number, oldXP: number, newXP: number, level: Level, nextLevel: NextLevel | null, levelUp: boolean, achievements?: Achievement[]) => void;
    hideXpNotification: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    session: null,
    setSession: (session: RaclottoSession) => set({ session }),
    clearSession: () => set({ session: null }),
    settingsRefreshTrigger: 0,
    triggerSettingsRefresh: () => set((state) => ({ 
        settingsRefreshTrigger: state.settingsRefreshTrigger + 1 
    })),
    removeWidthCap: false,
    setRemoveWidthCap: (remove: boolean) => set({ removeWidthCap: remove }),
    xpNotification: {
        visible: false,
        xpGained: 0,
        oldXP: 0,
        newXP: 0,
        level: null,
        nextLevel: null,
        levelUp: false,
        achievements: [],
    },
    showXpNotification: (xpGained, oldXP, newXP, level, nextLevel, levelUp, achievements = []) => set({
        xpNotification: {
            visible: true,
            xpGained,
            oldXP,
            newXP,
            level,
            nextLevel,
            levelUp,
            achievements: achievements || [],
        },
    }),
    hideXpNotification: () => set((state) => ({
        xpNotification: {
            ...state.xpNotification,
            visible: false,
        },
    })),
}));

