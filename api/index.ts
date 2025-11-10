import axios, { AxiosInstance } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api: AxiosInstance = axios.create({
  baseURL: "https://react-bank-project.eapi.joincoded.com/",
});

// Add token to requests that require authentication
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("@auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401/403 errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        console.error("Authentication error:", {
          status,
          url: error.config?.url,
          message: error.response.data?.message,
        });
      }
    }
    return Promise.reject(error);
  }
);

export default api;
