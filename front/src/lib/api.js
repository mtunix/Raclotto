export class Api {
    static async get(name, session) {
        let res;

        if (session) {
            res = await fetch("api/" + name + "/?session_key=" + session);
        } else {
            res = await fetch("api/" + name);
        }

        return await res.json();
    }

    static async validate(sessionKey) {
        let res = await fetch("api/sessions/validate/?session_key=" + sessionKey);
        return await res.json();
    }

    static async delete(sessionKey, ingredient) {
        let res = await fetch("api/ingredients/delete", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            redirect: 'follow',
            body: JSON.stringify(
                Object.assign({}, {session_key: sessionKey}, ingredient)
            )
        });
        return await res.json();
    }

    static async close(sessionKey) {
        let res = await fetch("api/sessions/close", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            redirect: 'follow',
            body: JSON.stringify(
                {session_key: sessionKey}
            )
        });
        return await res.json();
    }

    static async add(session, ingredient) {
        let res = await fetch("api/ingredients/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            redirect: 'follow',
            body: JSON.stringify(
                Object.assign({}, {session_key: session}, ingredient)
            )
        });
        return await res.json();
    }

    static async rate(session, pan, rating) {
        let res = await fetch("api/ratings/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            redirect: 'follow',
            body: JSON.stringify({
                session_key: session,
                pan: pan,
                user: this.getUser(),
                rating: rating
            })
        });
        return await res.json();
    }

    static async generate(session, numIngredient, numSauce) {
        let res = await fetch("api/generate/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            redirect: 'follow',
            body: JSON.stringify({
                session_key: session,
                user: this.getUser(),
                num_fill: numIngredient,
                num_sauce: numSauce,
                vegetarian: this.getSnackable("vegetarian"),
                vegan: this.getSnackable("vegan"),
                histamine: this.getSnackable("histamine"),
                fructose: this.getSnackable("fructose"),
                lactose: this.getSnackable("lactose"),
                gluten: this.getSnackable("gluten")
            })
        });
        return await res.json();
    }

    static async createSession(name) {
        let res = await fetch("api/sessions/create/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            redirect: 'follow',
            body: JSON.stringify({ name: name })
        });
        return await res.json();
    }

    static getUser() {
        let user = "unknown";

        if (localStorage.getItem("name")) {
            user = localStorage.getItem("name");
        }

        return user;
    }

    static getSnackable(key) {
        let snackable = true;

        if (localStorage.getItem(key)) {
            snackable = localStorage.getItem(key);
        }

        return snackable;
    }
}