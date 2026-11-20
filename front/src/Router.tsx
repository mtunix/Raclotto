import {createBrowserRouter} from "react-router";
import ErrorPage from "./shared/ErrorPage/ErrorPage";
import App from "./App";
import {SessionSelector} from "./shared/StartScreen/StartScreen";
import {MainScreen} from "./shared/MainScreen/MainScreen";
import {LoginView} from "./features/auth/components/LoginView";
import {ProtectedRoute} from "./features/auth/components/ProtectedRoute";
import {SessionLayout} from "./shared/SessionLayout";
import {SpinnerContainer} from "./shared/Spinner/Spinner";

export const RaclottoRouter = createBrowserRouter([
    {
        path: "/",
        element: <App/>,
        errorElement: <ErrorPage/>,
        // Shown while the first page's code loads; the feature pages are split out of the main bundle.
        hydrateFallbackElement: <SpinnerContainer/>,
        children: [
            {
                path: "login",
                element: <LoginView/>,
                errorElement: <ErrorPage/>,
            },
            {
                path: "register",
                lazy: {Component: async () => (await import("./features/auth/components/RegisterView")).RegisterView},
                errorElement: <ErrorPage/>,
            },
            {
                path: "join/:code",
                lazy: {Component: async () => (await import("./features/auth/components/JoinView")).JoinView},
                errorElement: <ErrorPage/>,
            },
            {
                path: "rules",
                lazy: {Component: async () => (await import("./shared/Rules/RulesView")).RulesView},
                errorElement: <ErrorPage/>,
            },
            {
                path: "recap/:sessionKey",
                lazy: {
                    element: async () => {
                        const {RecapView} = await import("./features/recap/RecapView");
                        return <ProtectedRoute><RecapView/></ProtectedRoute>;
                    },
                },
                errorElement: <ErrorPage/>,
            },
            {
                path: "",
                element: (
                    <ProtectedRoute>
                        <SessionSelector/>
                    </ProtectedRoute>
                ),
                errorElement: <ErrorPage/>,
            },
            {
                path: ":sessionId",
                element: (
                    <ProtectedRoute>
                        <SessionLayout/>
                    </ProtectedRoute>
                ),
                errorElement: <ErrorPage/>,
                children: [
                    {
                        element: <MainScreen/>,
                        errorElement: <ErrorPage/>,
                        children: [
                            {
                                index: true,
                                element: <></>, // Empty fragment for base route
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "dashboard",
                                lazy: {Component: async () => (await import("./features/dashboard/components/Dashboard")).Dashboard},
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "generate",
                                lazy: {Component: async () => (await import("./features/generation/GenerateView/GenerateView")).GenerateView},
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "history",
                                lazy: {Component: async () => (await import("./features/history/components/HistoryView")).HistoryView},
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "add",
                                lazy: {Component: async () => (await import("./features/ingredients/components/KitchenManagement")).KitchenManagement},
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "settings",
                                lazy: {Component: async () => (await import("./features/settings/SettingsView")).SettingsView},
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "achievements",
                                lazy: {Component: async () => (await import("./features/achievements/AchievementView")).AchievementView},
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "profile/:userId?",
                                lazy: {Component: async () => (await import("./features/profile/ProfileView")).ProfileView},
                                errorElement: <ErrorPage/>,
                            },
                        ]
                    }
                ]
            }
        ]
    }
])