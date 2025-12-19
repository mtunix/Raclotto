import {createBrowserRouter} from "react-router-dom";
import ErrorPage from "./components/common/error/ErrorPage";
import App from "./App";
import {SessionSelector} from "./components/StartScreen";
import {MainScreen} from "./components/MainScreen";
import {LoginView} from "./components/LoginView";
import {RegisterView} from "./components/RegisterView";
import {ProtectedRoute} from "./components/ProtectedRoute";
import {SessionLayout} from "./components/SessionLayout";
import {Dashboard} from "./components/Dashboard";
import {GenerateView} from "./components/GenerateView";
import {HistoryView} from "./components/HistoryView";
import {KitchenManagement} from "./components/KitchenManagement";
import {SettingsView} from "./components/SettingsView";
import {AchievementView} from "./components/AchievementView";
import {ProfileView} from "./components/ProfileView";

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