// Use environment variable for API URL, fallback to localhost for development
export const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
