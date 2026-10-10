import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // 5 s "fresco": navegar entre páginas no dispara peticiones repetidas al instante.
        staleTime: 5_000,
        // No reintenta errores 4xx (un 404 no se arregla reintentando); sí los de red/5xx, hasta 2 veces.
        retry: (failureCount, error) => {
          const status = isAxiosError(error) ? error.response?.status : undefined;
          if (status !== undefined && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
