"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { createQueryClient } from "@/shared/lib/query-client";

export function Providers({ children }: { children: ReactNode }) {
  // useState garantiza un QueryClient por pestaña que sobrevive a los re-renders.
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
