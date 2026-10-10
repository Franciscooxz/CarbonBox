import axios, { isAxiosError } from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1",
  timeout: 30_000,
});

/** El backend responde { error, message }; esto extrae un mensaje legible de cualquier error. */
export const getErrorMessage = (error: unknown): string => {
  if (isAxiosError<{ message?: string }>(error)) {
    if (error.response?.data?.message) return error.response.data.message;
    if (!error.response) return "No se pudo conectar con el servidor. ¿Está corriendo la API?";
  }
  return error instanceof Error ? error.message : "Error inesperado";
};
