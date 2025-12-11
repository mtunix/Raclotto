import { create } from "zustand";
import { RaclottoSession } from "./model/raclottoSession";

interface AppState {
    session: RaclottoSession | null;
    setSession: (session: RaclottoSession) => void;
    clearSession: () => void;
    settingsRefreshTrigger: number;
    triggerSettingsRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    session: null,
    setSession: (session: RaclottoSession) => set({ session }),
    clearSession: () => set({ session: null }),
    settingsRefreshTrigger: 0,
    triggerSettingsRefresh: () => set((state) => ({ 
        settingsRefreshTrigger: state.settingsRefreshTrigger + 1 
    })),
}));

