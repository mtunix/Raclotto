import {createBrowserRouter} from "react-router-dom";
import ErrorPage from "./components/common/error/ErrorPage";
import App from "./App";
import {SessionSelector} from "./components/StartScreen";

export const RaclottoRouter = createBrowserRouter([
    {
        path: "/",
        element: <App/>,
        errorElement: <ErrorPage/>,
        children: [
            {
                path: "",
                element: <SessionSelector/>,
                errorElement: <ErrorPage/>,
            }
        ]
    }
])