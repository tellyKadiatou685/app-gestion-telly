// src/config.ts
import axios from "axios";

// ✅ Utilisez l'URL correcte de votre backend sur Vercel
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://koula-backend.vercel.app/api",
  // Pour le développement local: "http://localhost:4000/api"
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Redirige vers /login si token expiré
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;