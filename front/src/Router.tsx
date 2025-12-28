import {createBrowserRouter} from "react-router-dom";
import ErrorPage from "./shared/components/common/error/ErrorPage";
import App from "./App";
import {SessionSelector} from "./features/dashboard/components/StartScreen";
import {MainScreen} from "./features/dashboard/components/MainScreen";
import {LoginView} from "./features/auth/components/LoginView";
import {RegisterView} from "./features/auth/components/RegisterView";
import {ProtectedRoute} from "./features/auth/components/ProtectedRoute";
import {SessionLayout} from "./shared/components/layout/SessionLayout";
import {Dashboard} from "./features/dashboard/components/Dashboard";
import {GenerateView} from "./features/generation/components/GenerateView";
import {HistoryView} from "./features/history/components/HistoryView";
import {KitchenManagement} from "./features/dashboard/components/KitchenManagement";
import {SettingsView} from "./features/settings/SettingsView";
import {AchievementView} from "./features/achievements/AchievementView";
import {ProfileView} from "./features/profile/ProfileView";

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