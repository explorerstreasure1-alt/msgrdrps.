const BASE = import.meta.env.VITE_API_URL || "";

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(BASE + path, init);
}
