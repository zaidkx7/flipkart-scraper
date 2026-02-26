import api from "..";

export interface ScraperResponse {
    message: string;
    status: string;
}

export const scraperApi = {
    startScraper: async (query: string, maxPages: number): Promise<ScraperResponse> => {
        const response = await api.post<ScraperResponse>('/scraper/start', {
            query: query,
            max_pages: maxPages,
        });
        return response.data;
    },
    stopScraper: async (): Promise<ScraperResponse> => {
        const response = await api.post<ScraperResponse>('/scraper/stop');
        return response.data;
    },
};
