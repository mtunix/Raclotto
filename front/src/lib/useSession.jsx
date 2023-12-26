import {useCallback, useEffect, useState} from "react";
import {Api} from "./api";
import {Notifications} from "./notifications";
import {useParams} from "react-router-dom";

function getLocalSession() {
    try {
        return JSON.parse(localStorage.getItem("session"))
    } catch (e) {
        return undefined;
    }
}

export function useSession() {
    const {sessionId} = useParams();
    const [session, setSession] = useState(getLocalSession());
    const [sessions, setSessions] = useState([]);

    const joinSession = useCallback((session) => {
        setSession(session);
        localStorage.setItem("session", session)
    }, []);

    const closeSession = useCallback(() => {
        setSession("");
        localStorage.setItem("session", "");
    }, []);

    const createSession = useCallback((name) => {
        return Api.createSession(name).then((data) => {
            setSession(data["session"]);
            localStorage.setItem("session", JSON.stringify(data["session"]));
            return data["session"];
        })
    }, []);

    useEffect(() => {
        Api.get("sessions").then((data) => {
            setSessions(data);
            const searchKey = sessionId || getLocalSession()?.key;

            if (searchKey) {
                setSession(data.find((s) => s.key === searchKey));
            } else if (data.length > 0) {
                setSession(data[0])
            }
        });

        Api.validate(session).then((data) => {
            console.log(data);
            if (data[session]) {
                setSession(data[session])
            }
        });
    }, [sessionId]);

    return {
        session: session,
        sessions: sessions,
        join: joinSession,
        close: closeSession,
        create: createSession
    }
}