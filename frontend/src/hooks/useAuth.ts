import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, ApiError, apiBaseUrl } from "@/lib/api";
import { applyTheme } from "@/lib/theme";
import type { UserSelf } from "@/types";

export function useAuth() {
  const qc = useQueryClient();
  const query = useQuery<UserSelf | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api.get<UserSelf>("/auth/me");
      } catch (err) {
        // 401 (not authenticated) or network error → treat as logged out
        if (err instanceof ApiError && err.status === 401) return null;
        if (!(err instanceof ApiError)) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) {
      applyTheme(query.data.theme_color, query.data.theme_pattern);
    }
  }, [query.data?.theme_color, query.data?.theme_pattern]);

  const loginUrl = `${apiBaseUrl}/api/auth/google/login`;
  const logout = async () => {
    await api.post("/auth/logout");
    qc.setQueryData(["me"], null);
    qc.invalidateQueries();
  };

  return { user: query.data ?? null, isLoading: query.isLoading, error: query.error, loginUrl, logout };
}
