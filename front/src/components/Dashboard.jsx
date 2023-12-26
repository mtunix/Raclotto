import {useSession} from "../lib/useSession";
import {useEffect} from "react";
import {Api} from "../lib/api";

export function Dashboard() {
    const {session} = useSession();

    useEffect(() => {
        Api.getStats(session).then((data) => {
            console.log(data);
        });
    }, [session]);

    return (
        <div>
            <h1>Dashboard</h1>
            <p>This is a protected route</p>
        </div>
    );
}
