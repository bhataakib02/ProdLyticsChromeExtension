import axios from "axios";
import { API_URL } from "@/context/AuthContext";

const getHeaders = () => {
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const trackingService = {
    async getMetrics(range = "today", requestConfig = {}) {
        const response = await axios.get(`${API_URL}/tracking?range=${range}`, {
            headers: getHeaders(),
            ...requestConfig,
        });
        return response.data;
    },

    async getSummary(range = "today") {
        const q = range && range !== "today" ? `?range=${encodeURIComponent(range)}` : "";
        const response = await axios.get(`${API_URL}/tracking/stats${q}`, { headers: getHeaders() });
        return response.data;
    },

    async getScore(range = "today", requestConfig = {}) {
        const response = await axios.get(`${API_URL}/tracking/score?range=${range}`, {
            headers: getHeaders(),
            ...requestConfig,
        });
        return response.data;
    },

    async getHourlyMetrics(range = "today", requestConfig = {}) {
        const response = await axios.get(`${API_URL}/tracking/hourly?range=${range}`, {
            headers: getHeaders(),
            ...requestConfig,
        });
        return response.data;
    },

    async getCognitiveLoad() {
        const response = await axios.get(`${API_URL}/tracking/cognitive-load`, { headers: getHeaders() });
        return response.data;
    },

    async getDeepWorkHistory() {
        const response = await axios.get(`${API_URL}/deepwork`, { headers: getHeaders() });
        return response.data;
    },

    async saveDeepWorkSession(payload) {
        const response = await axios.post(`${API_URL}/deepwork`, payload, { headers: getHeaders() });
        return response.data;
    },
};
