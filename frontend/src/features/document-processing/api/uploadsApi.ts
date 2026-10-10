import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import {
  type CreatedUpload,
  type PaginatedUploads,
  type Upload,
  type UploadResults,
  type UploadStats,
  isFinalStatus,
} from "../types/upload.types";

export const POLLING_INTERVAL_MS = 3_000;
export const PAGE_SIZE = 10;

// Claves jerárquicas: invalidar ["uploads"] refresca lista, detalle y stats de una sola vez.
export const uploadKeys = {
  all: ["uploads"] as const,
  list: (page: number) => ["uploads", "list", page] as const,
  stats: () => ["uploads", "stats"] as const,
  detail: (id: string) => ["uploads", "detail", id] as const,
  results: (id: string) => ["uploads", "results", id] as const,
};

export const uploadsApi = {
  list: async (page: number): Promise<PaginatedUploads> =>
    (await apiClient.get<PaginatedUploads>("/uploads", { params: { page, limit: PAGE_SIZE } })).data,
  stats: async (): Promise<UploadStats> => (await apiClient.get<UploadStats>("/uploads/stats")).data,
  getById: async (id: string): Promise<Upload> => (await apiClient.get<Upload>(`/uploads/${id}`)).data,
  results: async (id: string): Promise<UploadResults> =>
    (await apiClient.get<UploadResults>(`/uploads/${id}/results`)).data,
  create: async (file: File, onProgress: (percent: number) => void): Promise<CreatedUpload> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<CreatedUpload>("/uploads", formData, {
      onUploadProgress: (event) => onProgress(Math.round((event.progress ?? 0) * 100)),
    });
    return response.data;
  },
};

export const useUploads = (page: number) =>
  useQuery({
    queryKey: uploadKeys.list(page),
    queryFn: () => uploadsApi.list(page),
    // Mantiene la página anterior visible mientras carga la siguiente (sin parpadeo).
    placeholderData: keepPreviousData,
    // Si hay uploads en curso, la lista también se actualiza sola.
    refetchInterval: (query) =>
      query.state.data?.data.some((upload) => !isFinalStatus(upload.status)) ? POLLING_INTERVAL_MS : false,
  });

export const useUploadStats = () =>
  useQuery({
    queryKey: uploadKeys.stats(),
    queryFn: uploadsApi.stats,
    refetchInterval: (query) =>
      query.state.data && query.state.data.pending + query.state.data.processing > 0 ? POLLING_INTERVAL_MS : false,
  });

export const useUpload = (id: string) =>
  useQuery({
    queryKey: uploadKeys.detail(id),
    queryFn: () => uploadsApi.getById(id),
    // Polling mientras esté PENDING o PROCESSING; se apaga solo en COMPLETED o FAILED (ADR-002).
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && !isFinalStatus(status) ? POLLING_INTERVAL_MS : false;
    },
  });

export const useUploadResults = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: uploadKeys.results(id),
    queryFn: () => uploadsApi.results(id),
    // Solo se piden cuando el upload terminó: antes no hay nada que mostrar.
    enabled,
    // Los resultados de un upload terminado no cambian nunca.
    staleTime: Infinity,
  });

export const useCreateUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress: (percent: number) => void }) =>
      uploadsApi.create(file, onProgress),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: uploadKeys.all }),
  });
};
