import api from "..";

export interface SystemMetricsResponse {
    status: string;
    uptime: number;
    os: string;
    database: {
        total_products: number;
        status: string;
    };
    hardware: {
        cpu_usage: number;
        cpu_cores: number;
        memory_usage: number;
        memory_total_gb: number;
        memory_used_gb: number;
        disk_usage: number;
        disk_total_gb: number;
        disk_free_gb: number;
    };
}

export const systemApi = {
    getMetrics: async (): Promise<SystemMetricsResponse> => {
        const response = await api.get<SystemMetricsResponse>('/system/metrics');
        return response.data;
    },
};
