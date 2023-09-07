import {useSessions} from "../lib/api/ApiSession";
import {SpinnerContainer} from "./common/Spinner";
import ErrorPage from "./common/error/ErrorPage";

export function StartScreen() {
    let {data, isLoading, error} = useSessions();

    if (isLoading) return <SpinnerContainer/>;
    if (error) return <ErrorPage error={error}/>;
}