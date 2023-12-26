import {useCallback, useEffect, useState} from "react";
import {Api} from "./api";
import {Notifications} from "./notifications";
import {useParams} from "react-router-dom";

export function useSession() {
    const {sessionId} = useParams();
    const [session, setSession] = useState(localStorage.getItem("session") || undefined);
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
        return Api.createSession(name).then((data) => {
            setSession(data["session"]);
            localStorage.setItem("session", data["session"])
            return data["session"];
        })
    }, []);

    useEffect(() => {
        Api.get("sessions").then((data) => {
            setSessions(data);
            const searchKey = sessionId || localStorage.getItem("session");

            if (searchKey) {
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

    return {
        session: session,
        sessions: sessions,
        join: joinSession,
        close: closeSession,
        create: createSession
    }
}