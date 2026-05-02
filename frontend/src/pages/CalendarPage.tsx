import { useMemo, useState } from "react";
import clsx from "clsx";
import { addMonths, format, isSameDay, isSameMonth } from "date-fns";
import { useShifts } from "@/hooks/useShifts";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { api, apiBaseUrl } from "@/lib/api";
import { buildMonthGrid, fmtDate, fmtMonthLabel, TODAY, HORIZON_END, WEEKDAYS_JA } from "@/lib/dates";
import { ShiftEditModal } from "@/components/ShiftEditModal";
import type { Shift, UserPublic } from "@/types";

export function CalendarPage() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState<Date>(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [filterUserId, setFilterUserId] = useState<number | "all">(user!.id);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<Shift | null>(null);

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const start = grid[0];
  const end = grid[grid.length - 1];

  const { data: members } = useQuery<UserPublic[]>({
    queryKey: ["members"],
    queryFn: () => api.get<UserPublic[]>("/users"),
  });

  const { data: shifts } = useShifts({
    start: fmtDate(start),
    end: fmtDate(end),
    user_id: filterUserId === "all" ? undefined : filterUserId,
  });

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    (shifts ?? []).forEach((s) => {
      const key = s.shift_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [shifts]);

  const canPrev = cursor > new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1);
  const canNext = cursor < addMonths(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), 3);

  function downloadPdf(orientation: "landscape" | "portrait" = "landscape") {
    const userParam = filterUserId === "all" ? "" : `&user_id=${filterUserId}`;
    const url = `${apiBaseUrl}/api/pdf/monthly?year=${cursor.getFullYear()}&month=${cursor.getMonth() + 1}&orientation=${orientation}${userParam}`;
    window.open(url, "_blank");
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="btn btn-outline" disabled={!canPrev} onClick={() => setCursor((c) => addMonths(c, -1))}>‹</button>
        <h1 className="min-w-[8rem] text-center text-lg font-semibold">{fmtMonthLabel(cursor)}</h1>
        <button className="btn btn-outline" disabled={!canNext} onClick={() => setCursor((c) => addMonths(c, 1))}>›</button>
        <button className="btn btn-ghost" onClick={() => setCursor(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))}>今月</button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={filterUserId === "all" ? "all" : String(filterUserId)}
            onChange={(e) => setFilterUserId(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="text-sm"
          >
            <option value={user!.id}>自分のみ</option>
            <option value="all">全員</option>
            {(members ?? []).filter((m) => m.id !== user!.id).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button className="btn btn-outline" onClick={() => downloadPdf("landscape")}>PDF（横）</button>
          <button className="btn btn-ghost" onClick={() => downloadPdf("portrait")}>PDF（縦）</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 bg-ink-100/60 text-center text-xs font-medium text-ink-600">
          {WEEKDAYS_JA.map((w, i) => (
            <div key={w} className={clsx("py-2", i === 5 && "text-blue-600", i === 6 && "text-rose-600")}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d) => {
            const dateKey = fmtDate(d);
            const inMonth = isSameMonth(d, cursor);
            const today = isSameDay(d, TODAY);
            const tooFarPast = d < new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
            const tooFarFuture = d > HORIZON_END;
            const cellShifts = shiftsByDate.get(dateKey) ?? [];
            return (
              <button
                key={dateKey}
                onClick={() => !tooFarPast && !tooFarFuture && setOpenDate(dateKey)}
                disabled={tooFarPast || tooFarFuture}
                className={clsx(
                  "min-h-[88px] border-b border-r border-ink-200/70 p-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40",
                  !inMonth && "bg-ink-50/60 text-ink-400",
                  today && "ring-2 ring-inset ring-[var(--brand)]"
                )}
              >
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className={clsx("font-medium", today && "text-[var(--brand)]")}>{format(d, "d")}</span>
                  {cellShifts.length > 0 && (
                    <span className="rounded-full bg-ink-100 px-1.5 text-[10px] text-ink-600">{cellShifts.length}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {cellShifts.slice(0, 3).map((s) => (
                    <div
                      key={s.id}
                      onClick={(e) => { e.stopPropagation(); setEditing(s); setOpenDate(dateKey); }}
                      className={clsx(
                        "truncate rounded-md px-1.5 py-0.5 text-[10px] leading-tight ring-1",
                        s.status === "approved" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
                        s.status === "requested" && "bg-amber-50 text-amber-700 ring-amber-200",
                        s.status === "draft" && "bg-ink-100 text-ink-600 ring-ink-200",
                        s.status === "rejected" && "bg-rose-50 text-rose-700 ring-rose-200"
                      )}
                    >
                      {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}
                    </div>
                  ))}
                  {cellShifts.length > 3 && (
                    <div className="text-[10px] text-ink-400">+{cellShifts.length - 3} 件</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-600">
        <span className="chip chip-approved">確定</span>
        <span className="chip chip-requested">希望提出中</span>
        <span className="chip chip-draft">下書き</span>
        <span className="chip chip-rejected">差し戻し</span>
      </div>

      <ShiftEditModal
        isOpen={openDate !== null}
        onClose={() => { setOpenDate(null); setEditing(null); }}
        date={openDate ?? ""}
        shift={editing}
        user={user!}
        targetUserId={filterUserId !== "all" && filterUserId !== user!.id ? Number(filterUserId) : undefined}
      />
    </>
  );
}
