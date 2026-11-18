export interface ProfilePictureEntry {
    id: number;
    profile_picture: string;
    created_at: string;
    level_id: number | null;
    level_name: string | null;
    is_candidate: boolean;
}

export interface ProfilePictureHistory {
    history: ProfilePictureEntry[];
    total_count: number;
    user_id: number;
    user_name: string;
}

export interface GeneratedProfilePicture {
    imageBase64: string;
    format: string;
    userId: number;
    levelId: number | null;
    createdAt: string | null;
}
