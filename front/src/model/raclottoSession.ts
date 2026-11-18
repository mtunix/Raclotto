export class RaclottoSession {
    public id: number;
    public key: string;
    public name: string;
    public timestamp: Date;
    public active: boolean;

    constructor() {
        this.id = 0;
        this.key = "";
        this.name = "";
        this.timestamp = new Date();
        this.active = false;
    }

    static fromParsed(parsed: { id: number; key: string; name: string; timestamp: Date | string; active: boolean }) {
        let session = new RaclottoSession();
        session.id = parsed.id;
        session.key = parsed.key;
        session.name = parsed.name;
        session.timestamp = parsed.timestamp instanceof Date ? parsed.timestamp : new Date(parsed.timestamp);
        session.active = parsed.active;
        return session;
    }
}