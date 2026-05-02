import { useMemo, useState } from "react";
import { addMonths } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useBulkApprove, useShifts } from "@/hooks/useShifts";
import { fmtDate, TODAY } from "@/lib/dates";
import type { UserPublic } from "@/types";

export function ApprovalsPage() {
  const start = fmtDate(TODAY);
  const end = fmtDate(addMonths(TODAY, 3));
  const { data: shifts } = useShifts({ start, end, status: "requested" });
  const { data: members } = useQuery<UserPublic[]>({
    queryKey: ["members"],
    queryFn: () => api.get<UserPublic[]>("/users"),
  });
  const bulk = useBulkApprove();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.id, m])), [members]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelected(new Set((shifts ?? []).map((s) => s.id)));
  }
  async function approve() {
    if (selected.size === 0) return;
    await bulk.mutateAsync(Array.from(selected));
    setSelected(new Set());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">承認待ち（{(shifts ?? []).length}件）</h1>
        <div className="flex gap-2">
          <button onClick={selectAll} className="btn btn-outline">全て選択</button>
          <button onClick={approve} disabled={selected.size === 0 || bulk.isPending} className="btn btn-primary">
            選択を承認 ({selected.size})
          </button>
        </div>
      </div>

      <div className="card divide-y divide-ink-200/70">
        {(shifts ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-ink-400">承認待ちのシフトはありません</div>
        )}
        {(shifts ?? []).map((s) => (
          <label key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selected.has(s.id)}
              onChange={() => toggle(s.id)}
            />
            <div className="flex-1">
              <div className="text-sm font-medium">
                {memberById.get(s.user_id)?.name ?? "?"}
              </div>
              <div className="text-xs text-ink-400">
                {s.shift_date} {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}
                {s.break_minutes > 0 && ` / 休憩 ${s.break_minutes}分`}
                {s.notes && ` / ${s.notes}`}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
