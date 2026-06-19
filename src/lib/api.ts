/*
 * mirai-frontend
 * Desenvolvido originalmente por Bruno Bonetti — 2026
 * github.com/bonettibruno24 · brunobonetti.silva1@gmail.com
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");

export const apiUrl = (path: string) => {
  if (!API_BASE_URL) {
    throw new Error("Configure VITE_API_BASE_URL no arquivo .env.");
  }

  return `${API_BASE_URL}${path}`;
};

export const readApiError = async (response: Response, fallback: string) => {
  try {
    const body = await response.json();
    return body?.message ?? body?.erro ?? body?.error ?? fallback;
  } catch {
    return response.statusText || fallback;
  }
};
