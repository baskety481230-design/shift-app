import { useState } from "react";
import clsx from "clsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fmtDate } from "@/lib/dates";
import type { Shift, ShiftSwap, UserPublic } from "@/types";
import { format, addMonths } from "date-fns";

const STATUS_LABEL: Record<string, string> = {
  pending_peer: "相手の承認待ち",
  pending_manager: "店長承認待ち",
  approved: "承認済み",
  rejected: "却下",
  canceled: "取消",
};

export function SwapsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data: swaps } = useQuery<ShiftSwap[]>({
    queryKey: ["swaps"],
    queryFn: () => api.get<ShiftSwap[]>("/swaps"),
  });
  const { data: members } = useQuery<UserPublic[]>({
    queryKey: ["members"],
    queryFn: () => api.get<UserPublic[]>("/users"),
  });

  const peer = useMutation({
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) =>
      api.post<ShiftSwap>(`/swaps/${id}/peer-decision`, { accept }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swaps"] }),
  });
  const manager = useMutation({
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) =>
      api.post<ShiftSwap>(`/swaps/${id}/manager-decision`, { accept }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["swaps"] });
      qc.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
  const cancel = useMutation({
    mutationFn: (id: number) => api.post<ShiftSwap>(`/swaps/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swaps"] }),
  });

  const memberById = new Map((members ?? []).map((m) => [m.id, m]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">シフト交代</h1>
        <button onClick={() => setShowNew(true)} className="btn btn-primary">交代を依頼</button>
      </div>

      <div className="space-y-3">
        {(swaps ?? []).length === 0 && (
          <div className="card p-6 text-sm text-ink-400">交代依頼はありません</div>
        )}
        {(swaps ?? []).map((sw) => {
          const isRequester = sw.requester_id === user!.id;
          const isTarget = sw.target_user_id === user!.id;
          return (
            <div key={sw.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={clsx(
                  "chip",
                  sw.status === "approved" ? "chip-approved" :
                  sw.status === "rejected" || sw.status === "canceled" ? "chip-rejected" :
                  "chip-requested"
                )}>{STATUS_LABEL[sw.status] ?? sw.status}</span>
                <span className="text-ink-600">
                  {memberById.get(sw.requester_id)?.name ?? "?"} →
                  {" "}
                  {memberById.get(sw.target_user_id)?.name ?? "?"}
                </span>
                <span className="ml-auto text-xs text-ink-400">
                  {format(new Date(sw.created_at), "M/d HH:mm")}
                </span>
              </div>
              {sw.message && <p className="mt-2 rounded-lg bg-ink-100/70 px-3 py-2 text-sm text-ink-600">{sw.message}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {isTarget && sw.status === "pending_peer" && (
                  <>
                    <button onClick={() => peer.mutate({ id: sw.id, accept: true })} className="btn btn-primary">受ける</button>
                    <button onClick={() => peer.mutate({ id: sw.id, accept: false })} className="btn btn-outline">断る</button>
                  </>
                )}
                {user!.role === "manager" && sw.status === "pending_manager" && (
                  <>
                    <button onClick={() => manager.mutate({ id: sw.id, accept: true })} className="btn btn-primary">承認する</button>
                    <button onClick={() => manager.mutate({ id: sw.id, accept: false })} className="btn btn-outline">却下する</button>
                  </>
                )}
                {(isRequester || user!.role === "manager") && (sw.status === "pending_peer" || sw.status === "pending_manager") && (
                  <button onClick={() => cancel.mutate(sw.id)} className="btn btn-ghost text-rose-600">取り消す</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showNew && (
        <NewSwapModal members={(members ?? []).filter((m) => m.id !== user!.id)} onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}

function NewSwapModal({ members, onClose }: { members: UserPublic[]; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [target, setTarget] = useState<number | "">("");
  const [requesterShiftId, setRequesterShiftId] = useState<number | "">("");
  const [targetShiftId, setTargetShiftId] = useState<number | "">("");
  const [message, setMessage] = useState("");

  const today = new Date();
  const start = fmtDate(today);
  const end = fmtDate(addMonths(today, 3));

  const { data: myShifts } = useQuery<Shift[]>({
    queryKey: ["shifts", { start, end, user_id: user!.id, status: "approved" }],
    queryFn: () => api.get<Shift[]>(`/shifts?start=${start}&end=${end}&user_id=${user!.id}&status=approved`),
  });
  const { data: targetShifts } = useQuery<Shift[]>({
    queryKey: ["shifts", { start, end, user_id: target, status: "approved" }],
    enabled: target !== "",
    queryFn: () => api.get<Shift[]>(`/shifts?start=${start}&end=${end}&user_id=${target}&status=approved`),
  });

  const submit = useMutation({
    mutationFn: () =>
      api.post("/swaps", {
        requester_shift_id: Number(requesterShiftId),
        target_user_id: Number(target),
        target_shift_id: targetShiftId === "" ? null : Number(targetShiftId),
        message,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["swaps"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-end md:place-items-center bg-ink-900/40 p-0 md:p-6">
      <div className="card w-full max-w-md md:rounded-2xl rounded-t-2xl">
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
          <h2 className="text-base font-semibold">交代を依頼</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-100">✕</button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-xs text-ink-600">代わってもらう自分のシフト</span>
            <select className="w-full" value={requesterShiftId} onChange={(e) => setRequesterShiftId(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">選択してください</option>
              {(myShifts ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shift_date} {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-ink-600">依頼先</span>
            <select className="w-full" value={target} onChange={(e) => setTarget(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">選択してください</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>

          {target !== "" && (
            <label className="block">
              <span className="mb-1 block text-xs text-ink-600">相手のシフトと交換する場合</span>
              <select className="w-full" value={targetShiftId} onChange={(e) => setTargetShiftId(e.target.value === "" ? "" : Number(e.target.value))}>
                <option value="">交換しない（一方的に代わってもらう）</option>
                {(targetShifts ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shift_date} {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs text-ink-600">メッセージ</span>
            <textarea rows={3} className="w-full" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="例: 急用で代われません。お願いします！" />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3">
          <button onClick={onClose} className="btn btn-outline">キャンセル</button>
          <button
            onClick={() => submit.mutate()}
            disabled={requesterShiftId === "" || target === "" || submit.isPending}
            className="btn btn-primary"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
