import api from "@/lib/api";
import { AxiosInstance, AxiosRequestConfig } from "axios";
import { ApiResponse } from "@/types/api.types";

export abstract class ApiService {
    protected readonly api: AxiosInstance = api;

    protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.api.get<ApiResponse<T>>(url, config);
        return response.data.data;
    }

    protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.api.post<ApiResponse<T>>(url, data, config);
        return response.data.data;
    }

    protected async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.api.patch<ApiResponse<T>>(url, data, config);
        return response.data.data;
    }

    protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.api.delete<ApiResponse<T>>(url, config);
        return response.data.data;
    }

    protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.api.put<ApiResponse<T>>(url, data, config);
        return response.data.data;
    }
}
