import axios from "axios";
import { useAuthStore } from "@/store/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Підставляємо токен із store в кожен запит
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// При 401 — логаут (AuthProvider автоматично зробить редірект на /login)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const { token } = useAuthStore.getState();
      // Логаутимо тільки якщо були авторизовані (не під час fetchMe на login)
      if (token) {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);
