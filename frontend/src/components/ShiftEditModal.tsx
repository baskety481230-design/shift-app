import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useCreateShift, useDeleteShift, useUpdateShift } from "@/hooks/useShifts";
import { minutesToTime, shiftDurationHours, timeToMinutes } from "@/lib/dates";
import type { Shift, ShiftStatus, UserSelf } from "@/types";

const HALF_HOUR_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => minutesToTime(i * 30));

export function ShiftEditModal({
  isOpen,
  onClose,
  date,
  shift,
  user,
  targetUserId,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  shift?: Shift | null;
  user: UserSelf;
  targetUserId?: number; // for manager assigning to others
}) {
  const create = useCreateShift();
  const update = useUpdateShift();
  const del = useDeleteShift();

  const [start, setStart] = useState("17:00");
  const [end, setEnd] = useState("22:00");
  const [breakMin, setBreakMin] = useState(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shift) {
      setStart(shift.start_time.slice(0, 5));
      setEnd(shift.end_time.slice(0, 5));
      setBreakMin(shift.break_minutes);
      setNotes(shift.notes ?? "");
    } else {
      setStart("17:00");
      setEnd("22:00");
      setBreakMin(0);
      setNotes("");
    }
    setError(null);
  }, [shift, isOpen]);

  if (!isOpen) return null;

  const hours = shiftDurationHours(start, end, breakMin);

  async function handleSave(asStatus?: ShiftStatus) {
    setError(null);
    if (timeToMinutes(end) <= timeToMinutes(start)) {
      setError("終了時刻は開始時刻より後にしてください");
      return;
    }
    try {
      if (shift) {
        await update.mutateAsync({
          id: shift.id,
          start_time: start,
          end_time: end,
          break_minutes: breakMin,
          notes,
          ...(asStatus ? { status: asStatus } : {}),
        });
      } else {
        await create.mutateAsync({
          shift_date: date,
          start_time: start,
          end_time: end,
          break_minutes: breakMin,
          notes,
          ...(targetUserId ? { user_id: targetUserId } : {}),
          ...(asStatus ? { status: asStatus } : {}),
        });
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("保存に失敗しました");
    }
  }

  async function handleDelete() {
    if (!shift) return;
    if (!window.confirm("このシフトを削除しますか？")) return;
    try {
      await del.mutateAsync(shift.id);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "削除に失敗しました");
    }
  }

  const isManager = user.role === "manager";
  const editingOwn = !shift || shift.user_id === user.id;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end md:place-items-center bg-ink-900/40 p-0 md:p-6">
      <div className="card w-full max-w-md overflow-hidden md:rounded-2xl rounded-t-2xl">
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
          <h2 className="text-base font-semibold">
            {shift ? "シフトを編集" : "シフトを追加"} <span className="ml-1 text-ink-400">/ {date}</span>
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-100">✕</button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-ink-600">開始</span>
              <select className="w-full" value={start} onChange={(e) => setStart(e.target.value)}>
                {HALF_HOUR_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink-600">終了</span>
              <select className="w-full" value={end} onChange={(e) => setEnd(e.target.value)}>
                {HALF_HOUR_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-ink-600">休憩（分）</span>
            <input
              type="number"
              min={0}
              step={15}
              value={breakMin}
              onChange={(e) => setBreakMin(Math.max(0, parseInt(e.target.value || "0", 10)))}
              className="w-full"
            />
          </label>

          <div className="rounded-lg bg-ink-100/70 px-3 py-2 text-sm text-ink-600">
            実働 <span className="font-semibold text-ink-900">{hours.toFixed(2)} 時間</span>
            {editingOwn && user.hourly_wage > 0 && (
              <span className="ml-3 text-xs text-ink-400">
                概算 ¥{Math.round(hours * user.hourly_wage).toLocaleString()}
              </span>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-ink-600">メモ（店長宛など）</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" />
          </label>

          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3">
          <div>
            {shift && (
              <button onClick={handleDelete} className="btn btn-ghost text-rose-600 hover:bg-rose-50">
                削除
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn btn-outline">キャンセル</button>
            {isManager && (
              <button onClick={() => handleSave("approved")} className="btn btn-primary">承認して保存</button>
            )}
            {!isManager && (
              <button onClick={() => handleSave("requested")} className="btn btn-primary">希望を提出</button>
            )}
            {isManager && !shift && (
              <button onClick={() => handleSave("draft")} className="btn btn-outline">下書きで保存</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
