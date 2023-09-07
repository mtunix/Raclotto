import {createBrowserRouter} from "react-router-dom";
import ErrorPage from "./components/common/error/ErrorPage";
import App from "./App";
import {StartScreen} from "./components/StartScreen";

export const RaclottoRouter = createBrowserRouter([
    {
        path: "/",
        element: <App/>,
        errorElement: <ErrorPage/>,
        children: [
            {
                path: "start",
                element: <StartScreen/>,
                errorElement: <ErrorPage/>,
            }
        ]
    }
])