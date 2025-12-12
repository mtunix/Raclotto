export interface Event {
    id: number;
    event_type: string;
    message: string;
    data?: {
        pan1_id?: number;
        pan1_user_id?: number;
        pan1_user_name?: string;
        pan2_id?: number;
        pan2_user_id?: number;
        pan2_user_name?: string;
        time_window_minutes?: number;
        [key: string]: any;
    };
    created_at: string;
}

export class EventModel {
    public id: number;
    public event_type: string;
    public message: string;
    public data?: any;
    public created_at: Date;

    constructor() {
        this.id = 0;
        this.event_type = "";
        this.message = "";
        this.data = undefined;
        this.created_at = new Date();
    }

    static fromParsed(parsed: { id: number; event_type: string; message: string; data?: any; created_at: string | Date }): EventModel {
        let event = new EventModel();
        event.id = parsed.id;
        event.event_type = parsed.event_type;
        event.message = parsed.message;
        event.data = parsed.data;
        event.created_at = parsed.created_at instanceof Date ? parsed.created_at : new Date(parsed.created_at);
        return event;
    }
}

