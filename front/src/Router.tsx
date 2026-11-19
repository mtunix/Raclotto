import {createBrowserRouter} from "react-router";
import ErrorPage from "./shared/ErrorPage/ErrorPage";
import App from "./App";
import {SessionSelector} from "./shared/StartScreen/StartScreen";
import {MainScreen} from "./shared/MainScreen/MainScreen";
import {LoginView} from "./features/auth/components/LoginView";
import {RegisterView} from "./features/auth/components/RegisterView";
import {ProtectedRoute} from "./features/auth/components/ProtectedRoute";
import {SessionLayout} from "./shared/SessionLayout";
import {Dashboard} from "./features/dashboard/components/Dashboard";
import {GenerateView} from "./features/generation/GenerateView/GenerateView";
import {HistoryView} from "./features/history/components/HistoryView";
import {KitchenManagement} from "./features/ingredients/components/KitchenManagement";
import {SettingsView} from "./features/settings/SettingsView";
import {AchievementView} from "./features/achievements/AchievementView";
import {ProfileView} from "./features/profile/ProfileView";
import {RecapView} from "./features/recap/RecapView";
import {RulesView} from "./shared/Rules/RulesView";

export const RaclottoRouter = createBrowserRouter([
    {
        path: "/",
        element: <App/>,
        errorElement: <ErrorPage/>,
        children: [
            {
                path: "login",
                element: <LoginView/>,
                errorElement: <ErrorPage/>,
            },
            {
                path: "register",
                element: <RegisterView/>,
                errorElement: <ErrorPage/>,
            },
            {
                path: "rules",
                element: <RulesView/>,
                errorElement: <ErrorPage/>,
            },
            {
                path: "recap/:sessionKey",
                element: (
                    <ProtectedRoute>
                        <RecapView/>
                    </ProtectedRoute>
                ),
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
                                element: <Dashboard/>,
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "generate",
                                element: <GenerateView/>,
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "history",
                                element: <HistoryView/>,
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "add",
                                element: <KitchenManagement/>,
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "settings",
                                element: <SettingsView/>,
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "achievements",
                                element: <AchievementView/>,
                                errorElement: <ErrorPage/>,
                            },
                            {
                                path: "profile/:userId?",
                                element: <ProfileView/>,
                                errorElement: <ErrorPage/>,
                            },
                        ]
                    }
                ]
            }
        ]
    }
])