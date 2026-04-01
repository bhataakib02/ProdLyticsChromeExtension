import axios from "axios";
import { API_URL } from "@/context/AuthContext";
import { trackingRangeQueryString } from "@/lib/trackingClientRange";

const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
});

/** Today’s goal rows for dashboards / extension (ignores yesterday archive). */
export function goalsProgressTodayList(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.today) ? data.today : [];
}

export const goalsService = {
    async getObjectives() {
        const local = trackingRangeQueryString("today");
        const q = local ? `?${local.replace(/^&/, "")}` : "";
        const response = await axios.get(`${API_URL}/goals/progress${q}`, { headers: getHeaders() });
        return response.data;
    },

    async createObjective(goalData) {
        const response = await axios.post(`${API_URL}/goals/`, goalData, { headers: getHeaders() });
        return response.data;
    },

    async updateObjective(id, goalData) {
        const response = await axios.put(`${API_URL}/goals?id=${id}`, goalData, { headers: getHeaders() });
        return response.data;
    },

    async deleteObjective(id) {
        const response = await axios.delete(`${API_URL}/goals?id=${id}`, { headers: getHeaders() });
        return response.data;
    },

    async getBlocklist() {
        const response = await axios.get(`${API_URL}/focus/`, { headers: getHeaders() });
        return response.data;
    },

    async addToBlocklist(website) {
        const response = await axios.post(`${API_URL}/focus/`, { website }, { headers: getHeaders() });
        return response.data;
    },

    async removeFromBlocklist(id) {
        const response = await axios.delete(`${API_URL}/focus?id=${id}`, { headers: getHeaders() });
        return response.data;
    },
};
