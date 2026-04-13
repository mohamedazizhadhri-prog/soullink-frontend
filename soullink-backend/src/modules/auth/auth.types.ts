export interface AuthResponse {
    user: any;
    accessToken: string;
    refreshToken: string;
}

export interface VerificationData {
    email: string;
    code: string;
}
