import axios from "axios";
import { API_URL } from "@/context/AuthContext";

const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
});

export const notificationService = {
    async getNotifications() {
        const response = await axios.get(`${API_URL}/notifications`, { headers: getHeaders() });
        return response.data;
    },

    async createNotification(data) {
        const response = await axios.post(`${API_URL}/notifications`, data, { headers: getHeaders() });
        return response.data;
    },

    async markAllAsRead() {
        const response = await axios.patch(`${API_URL}/notifications`, {}, { headers: getHeaders() });
        return response.data;
    }
};
