import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response.data.data,
  (error) => {
    const msg = error.response?.data?.error ?? error.message ?? '요청 실패';
    return Promise.reject(new Error(msg));
  },
);

export function apiGet<T>(url: string): Promise<T> {
  return api.get(url) as Promise<T>;
}

export function apiPost<T>(url: string, data?: unknown): Promise<T> {
  return api.post(url, data) as Promise<T>;
}

export function apiPut<T>(url: string, data?: unknown): Promise<T> {
  return api.put(url, data) as Promise<T>;
}

export function apiDelete<T>(url: string): Promise<T> {
  return api.delete(url) as Promise<T>;
}
