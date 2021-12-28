export class Notifications {
    static SESSION_FOUND = () => {
        return {
            title: "Session gefunden",
            content: "Es wurde eine bestehende Session gefunden.",
            visible: true,
            delay: 3000,
            timestamp: Date.now()
        }
    };

    static NO_SESSIONS = () => {
        return {
            title: "Keine Sessions vorhanden",
            content: "Es existieren keine Sessions auf dem Server.",
            visible: true,
            delay: 3000,
            timestamp: Date.now()
        }
    };
}