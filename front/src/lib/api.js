export class Api {
    static async get(name, session) {
        let res = await fetch("api/" + name + "/?session_key=" + session);
        return await res.json();
    }

    static async validate(sessionKey) {
        let res = await fetch("api/sessions/validate/?session_key=" + sessionKey);
        return await res.json();
    }

    static async createSession(name) {
        let res = await fetch("api/sessions/create/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            redirect: 'follow',
            body: JSON.stringify({ name: name })
        });
        return await res.json();
    }
}