import {combineReducers, configureStore, PreloadedState} from "@reduxjs/toolkit";
import appReducer from "./AppSlice";

const rootReducer = combineReducers(
    {
        app: appReducer
    }
)

export const storeOptions = {
    reducer: rootReducer,
    middleware: (getDefaultMiddleware: any) => getDefaultMiddleware({
        serializableCheck: false,
    }),
};

export function setupStore(preloadedState?: PreloadedState<RootState>) {
    return configureStore({
        ...storeOptions,
        ...preloadedState
    });
}

export const appStore = setupStore();

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = AppStore['dispatch']