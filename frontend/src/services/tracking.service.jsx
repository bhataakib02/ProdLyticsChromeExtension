import axios from "axios";
import { API_URL } from "@/context/AuthContext";
import { trackingRangeQueryString } from "@/lib/trackingClientRange";

const getHeaders = () => {
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Local calendar day + IANA tz for today/yesterday; omit for week/month (server window). */
function localDayParams(range) {
    if (range === "today" || range === "yesterday") return trackingRangeQueryString(range);
    return "";
}

export const trackingService = {
    async getMetrics(range = "today", requestConfig = {}) {
        const local = localDayParams(range);
        const response = await axios.get(`${API_URL}/tracking?range=${encodeURIComponent(range)}${local}`, {
            headers: getHeaders(),
            ...requestConfig,
        });
        return response.data;
    },

    async getSummary(range = "today") {
        const q = range && range !== "today" ? `?range=${encodeURIComponent(range)}` : "?range=today";
        const local = localDayParams(range);
        const response = await axios.get(`${API_URL}/tracking/stats${q}${local}`, { headers: getHeaders() });
        return response.data;
    },

    async getScore(range = "today", requestConfig = {}) {
        const local = localDayParams(range);
        const response = await axios.get(`${API_URL}/tracking/score?range=${encodeURIComponent(range)}${local}`, {
            headers: getHeaders(),
            ...requestConfig,
        });
        return response.data;
    },

    async getHourlyMetrics(range = "today", requestConfig = {}) {
        const local = localDayParams(range);
        const response = await axios.get(`${API_URL}/tracking/hourly?range=${encodeURIComponent(range)}${local}`, {
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
