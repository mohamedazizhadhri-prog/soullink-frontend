export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
}

export interface ApiError {
    message: string;
    code?: string;
    details?: any;
}
