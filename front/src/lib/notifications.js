export class Notifications {
    static SESSION_FOUND = () => {
        return {
            title: "Session gefunden",
            content: "Es wurde eine bestehende Session gefunden",
            visible: true,
            delay: 3000,
            timestamp: Date.now()
        }
    };
}