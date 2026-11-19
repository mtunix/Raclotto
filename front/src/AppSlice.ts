import { create } from "zustand";
import type { AchievementDto, RewardDto, SessionDto } from "./api/generated/model";

interface XpNotificationState {
    visible: boolean;
    reward: RewardDto | null;
    achievements: AchievementDto[];
}

interface AppState {
    session: SessionDto | null;
    setSession: (session: SessionDto) => void;
    clearSession: () => void;
    settingsRefreshTrigger: number;
    triggerSettingsRefresh: () => void;
    removeWidthCap: boolean;
    setRemoveWidthCap: (remove: boolean) => void;
    xpNotification: XpNotificationState;
    showXpNotification: (reward: RewardDto, achievements: AchievementDto[]) => void;
    hideXpNotification: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    session: null,
    setSession: (session: SessionDto) => set({ session }),
    clearSession: () => set({ session: null }),
    settingsRefreshTrigger: 0,
    triggerSettingsRefresh: () => set((state) => ({ 
        settingsRefreshTrigger: state.settingsRefreshTrigger + 1 
    })),
    removeWidthCap: false,
    setRemoveWidthCap: (remove: boolean) => set({ removeWidthCap: remove }),
    xpNotification: {
        visible: false,
        reward: null,
        achievements: [],
    },
    showXpNotification: (reward, achievements) => set({
        xpNotification: { visible: true, reward, achievements },
    }),
    hideXpNotification: () => set((state) => ({
        xpNotification: {
            ...state.xpNotification,
            visible: false,
        },
    })),
}));

