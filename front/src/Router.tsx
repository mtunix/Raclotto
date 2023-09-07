import {createBrowserRouter} from "react-router-dom";
import ErrorPage from "./components/common/error/ErrorPage";
import App from "./App";

export const RaclottoRouter = createBrowserRouter([
    {
        path: "/",
        element: <App/>,
        errorElement: <ErrorPage/>,
        children: [
        ]
    }
])