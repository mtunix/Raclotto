export interface Achievement {
    id: number;
    title: string;
    description: string;
    value: number;
    hidden: boolean;
    unlocked?: boolean;  // Optional: only present if user is authenticated
    progress?: number;   // Optional: progress value between 0.0 and 1.0, only present if tracked
}

