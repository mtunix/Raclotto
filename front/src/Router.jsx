import {createBrowserRouter} from "react-router-dom";
import {StartScreen} from "./components/StartScreen";
import {MainScreen} from "./components/MainScreen";
import App from "./App";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <App/>,
        children: [
            {
                path: "/",
                element: <StartScreen/>,
            },
            {
                path: "/session/:sessionId",
                element: <MainScreen/>,
            }
        ]
    },
]);