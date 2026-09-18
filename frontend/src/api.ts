import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error))
    return error.response?.data?.detail || 'Request failed. Please try again.';
  return 'Something went wrong.';
}
