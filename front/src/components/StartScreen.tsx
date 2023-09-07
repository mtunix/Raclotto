import {useSessions} from "../lib/api/ApiSession";
import {SpinnerContainer} from "./common/Spinner";
import ErrorPage from "./common/error/ErrorPage";

export function StartScreen() {
    let {data, isLoading, error} = useSessions();

    if (isLoading) return <SpinnerContainer/>;
    if (error) return <ErrorPage error={error}/>;

    return (
        <div id="start-screen">
            <h1>Start Screen</h1>
            <p>There are {data.length} sessions.</p>
        </div>
    );
}