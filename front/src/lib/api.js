export class Api {
    static get(name) {
        let set = [];
        fetch("api/" + name)
            .then(function (response) {
                response.json().then(function (data) {
                    // workaround to use string as key
                    set[name] = data;
                });
            })
            .catch(function (error) {
                console.warn(error);
            });

        return set
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
}