export interface EventConfig {
    id: number;
    event_type: string;
    session_id?: number | null;
    enabled: boolean;
    frequency_minutes?: number | null;
}

export class EventConfigModel {
    public id: number;
    public event_type: string;
    public session_id?: number | null;
    public enabled: boolean;
    public frequency_minutes?: number | null;

    constructor() {
        this.id = 0;
        this.event_type = "";
        this.session_id = null;
        this.enabled = true;
        this.frequency_minutes = null;
    }

    static fromParsed(parsed: { id: number; event_type: string; session_id?: number | null; enabled: boolean; frequency_minutes?: number | null }): EventConfigModel {
        let config = new EventConfigModel();
        config.id = parsed.id;
        config.event_type = parsed.event_type;
        config.session_id = parsed.session_id ?? null;
        config.enabled = parsed.enabled;
        config.frequency_minutes = parsed.frequency_minutes ?? null;
        return config;
    }
}

