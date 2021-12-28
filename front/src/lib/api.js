export class Api {
    static async get(name) {
        let res = await fetch("api/" + name);
        return await res.json();
    }

    static validate(sessionKey) {
        fetch("api/sessions/validate/?session_key=" + sessionKey)
            .then(function (response) {
                response.json().then(function (data) {
                    return data[sessionKey];
                });
            })
            .catch(function (error) {
                console.warn(error);
            });

        return false;
    }

    static createSession(name) {
        fetch("api/sessions/create/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            redirect: 'follow',
            body: JSON.stringify({ name: name })
        })
            .then(function (response) {
                response.json().then(function (data) {
                    return data;
                });
            })
            .catch(function (error) {
                console.warn(error);
            });

        return false;
    }
}