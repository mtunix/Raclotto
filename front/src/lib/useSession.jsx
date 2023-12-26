import {useCallback, useEffect, useState} from "react";
import {Api} from "./api";
import {Notifications} from "./notifications";
import {useParams} from "react-router-dom";

export function useSession() {
    const {sessionId} = useParams();
    const [session, setSession] = useState("");
    const [sessions, setSessions] = useState([]);

    const joinSession = useCallback((session) => {
        setSession(session);
        localStorage.setItem("session", session)
    }, []);

    const closeSession = useCallback(() => {
        setSession("");
        localStorage.setItem("session", "")
    }, []);

    const createSession = useCallback((name) => {
        Api.createSession(name).then((data) => {
            setSession(data["session"])
        })
    }, []);

    useEffect(() => {
        Api.get("sessions").then((data) => {
            setSessions(data)
            const searchKey = sessionId || localStorage.getItem("session");
            if (searchKey && data.includes(searchKey)) {
                setSession(data.find((s) => s.key === searchKey));
            } else if (data.length > 0) {
                setSession(data[0])
            }
        });

        Api.validate(session).then((data) => {
            if (data[session]) {
                setSession(data[session])
            }
        });
    }, []);

    console.log(
        {
            session: session,
            sessions: sessions,
            join: joinSession,
            close: closeSession,
            create: createSession
        }
    )

    return {
        session: session,
        sessions: sessions,
        join: joinSession,
        close: closeSession,
        create: createSession
    }
}