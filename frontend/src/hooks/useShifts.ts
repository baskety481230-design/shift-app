import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Shift, ShiftStatus } from "@/types";

export interface ShiftRangeParams {
  start: string; // YYYY-MM-DD
  end: string;
  user_id?: number;
  status?: ShiftStatus;
}

export function useShifts(params: ShiftRangeParams) {
  const qs = new URLSearchParams({ start: params.start, end: params.end });
  if (params.user_id !== undefined) qs.set("user_id", String(params.user_id));
  if (params.status) qs.set("status", params.status);
  return useQuery<Shift[]>({
    queryKey: ["shifts", params],
    queryFn: () => api.get<Shift[]>(`/shifts?${qs.toString()}`),
  });
}

export interface CreateShiftPayload {
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  notes?: string | null;
  user_id?: number;
  status?: ShiftStatus;
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateShiftPayload) => api.post<Shift>("/shifts", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<CreateShiftPayload> & { id: number }) =>
      api.patch<Shift>(`/shifts/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/shifts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => api.post<Shift[]>("/shifts/bulk-approve", { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });
}
