export interface UpdateUserProfileData {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
}

export interface UserProfileResponse {
    id: string;
    email: string;
    handle: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
    status: string;
}
