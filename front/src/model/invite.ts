export interface Invite {
    id: number;
    token: string;
    email: string;
    expires_at: string;
    is_used: boolean;
    used_at: string | null;
}
