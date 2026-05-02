// Dev-only API mock. Activated when VITE_MOCK_API === "1".
// Lets you preview every page without running the backend.
import type { Invite, Shift, ShiftSwap, UserManagerView, UserPublic, UserSelf } from "@/types";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function nowIso() {
  return new Date().toISOString();
}

const ME: UserSelf = {
  id: 1,
  email: "manager@example.com",
  name: "山田 太郎",
  avatar_url: null,
  comment: "店長です。シフトはお気軽にどうぞ！",
  role: "manager",
  hourly_wage: 1500,
  theme_color: 1,
  theme_pattern: 2,
  notify_minutes_before: 60,
  notify_enabled: true,
};

const MEMBERS: UserPublic[] = [
  { id: 1, name: "山田 太郎", avatar_url: null, comment: "店長です", role: "manager", theme_color: 1, theme_pattern: 2 },
  { id: 2, name: "佐藤 花子", avatar_url: null, comment: "ホール担当 / 大学生", role: "staff", theme_color: 8, theme_pattern: 5 },
  { id: 3, name: "鈴木 健太", avatar_url: null, comment: "キッチン歴2年", role: "staff", theme_color: 4, theme_pattern: 1 },
  { id: 4, name: "田中 美咲", avatar_url: null, comment: "土日メインです", role: "staff", theme_color: 9, theme_pattern: 7 },
  { id: 5, name: "高橋 翔", avatar_url: null, comment: "夜シフト得意", role: "staff", theme_color: 0, theme_pattern: 0 },
  { id: 6, name: "渡辺 さくら", avatar_url: null, comment: "新人です", role: "staff", theme_color: 7, theme_pattern: 11 },
  { id: 7, name: "伊藤 拓也", avatar_url: null, comment: "", role: "staff", theme_color: 5, theme_pattern: 3 },
  { id: 8, name: "中村 葵", avatar_url: null, comment: "", role: "staff", theme_color: 11, theme_pattern: 14 },
  { id: 9, name: "小林 涼", avatar_url: null, comment: "", role: "staff", theme_color: 3, theme_pattern: 9 },
  { id: 10, name: "加藤 千夏", avatar_url: null, comment: "", role: "staff", theme_color: 6, theme_pattern: 6 },
];

const MEMBERS_MANAGER: UserManagerView[] = MEMBERS.map((m) => ({
  ...m,
  email: `${m.name.replace(/ /g, "").toLowerCase()}@example.com`,
  hourly_wage: m.role === "manager" ? 1500 : 1100 + ((m.id * 50) % 300),
  notify_minutes_before: 60,
  notify_enabled: true,
  is_active: true,
  created_at: "2026-01-15T00:00:00Z",
}));

let nextShiftId = 1000;
const SHIFTS: Shift[] = (() => {
  const list: Shift[] = [];
  const today = new Date();
  // Generate shifts: 5-day rotation across the next ~50 days for several users
  const rotation: Array<{ uid: number; start: string; end: string; status: Shift["status"] }> = [
    { uid: 2, start: "11:00:00", end: "16:00:00", status: "approved" },
    { uid: 3, start: "17:00:00", end: "22:00:00", status: "approved" },
    { uid: 4, start: "10:00:00", end: "15:00:00", status: "requested" },
    { uid: 5, start: "18:00:00", end: "23:00:00", status: "approved" },
    { uid: 1, start: "09:00:00", end: "18:00:00", status: "approved" },
    { uid: 6, start: "16:00:00", end: "20:00:00", status: "requested" },
    { uid: 7, start: "12:00:00", end: "17:00:00", status: "approved" },
    { uid: 8, start: "17:30:00", end: "22:30:00", status: "draft" },
  ];
  for (let i = -3; i < 50; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const day = d.getDay();
    if (day === 0) continue; // Sundays off
    const picks = rotation.filter((_, idx) => (idx + i) % 3 !== 0).slice(0, 3 + (i % 3));
    for (const r of picks) {
      list.push({
        id: nextShiftId++,
        user_id: r.uid,
        shift_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        start_time: r.start,
        end_time: r.end,
        break_minutes: 30,
        status: r.status,
        notes: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    }
  }
  return list;
})();

const SWAPS: ShiftSwap[] = [
  {
    id: 1,
    requester_id: 3,
    target_user_id: 5,
    requester_shift_id: SHIFTS[0]?.id ?? 1000,
    target_shift_id: null,
    status: "pending_peer",
    message: "急用が入ってしまい、代わって頂けると助かります",
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: 2,
    requester_id: 4,
    target_user_id: 1,
    requester_shift_id: SHIFTS[3]?.id ?? 1003,
    target_shift_id: SHIFTS[4]?.id ?? 1004,
    status: "pending_manager",
    message: "佐藤さんと交換でOKもらいました！",
    created_at: nowIso(),
    updated_at: nowIso(),
  },
];

const INVITES: Invite[] = [
  { id: 1, email: "newhire@example.com", role: "staff", used: false, created_at: nowIso() },
];

function parseDateRange(qs: URLSearchParams): { start: string; end: string; user_id?: number; status?: string } {
  return {
    start: qs.get("start") ?? "",
    end: qs.get("end") ?? "",
    user_id: qs.get("user_id") ? Number(qs.get("user_id")) : undefined,
    status: qs.get("status") ?? undefined,
  };
}

export async function mockRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
  // simulate network latency
  await new Promise((r) => setTimeout(r, 60));
  const [pathOnly, queryStr] = path.split("?");
  const qs = new URLSearchParams(queryStr ?? "");

  if (method === "GET" && pathOnly === "/auth/me") return clone(ME) as T;
  if (method === "POST" && pathOnly === "/auth/logout") return undefined as T;

  if (method === "GET" && pathOnly === "/users") return clone(MEMBERS) as T;
  if (method === "GET" && pathOnly === "/users/manager") return clone(MEMBERS_MANAGER) as T;
  if (method === "PATCH" && pathOnly === "/users/me") {
    Object.assign(ME, body as Partial<UserSelf>);
    return clone(ME) as T;
  }
  if (method === "GET" && pathOnly === "/users/invites") return clone(INVITES) as T;

  if (method === "GET" && pathOnly === "/shifts") {
    const { start, end, user_id, status } = parseDateRange(qs);
    let list = SHIFTS.filter((s) => s.shift_date >= start && s.shift_date <= end);
    if (user_id !== undefined) list = list.filter((s) => s.user_id === user_id);
    if (status) list = list.filter((s) => s.status === status);
    return clone(list) as T;
  }
  if (method === "POST" && pathOnly === "/shifts") {
    const b = body as Partial<Shift> & { user_id?: number };
    const created: Shift = {
      id: nextShiftId++,
      user_id: b.user_id ?? ME.id,
      shift_date: b.shift_date!,
      start_time: b.start_time!,
      end_time: b.end_time!,
      break_minutes: b.break_minutes ?? 0,
      status: (b.status ?? "requested") as Shift["status"],
      notes: b.notes ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    SHIFTS.push(created);
    return clone(created) as T;
  }
  if (method === "PATCH" && pathOnly.startsWith("/shifts/")) {
    const id = Number(pathOnly.split("/").pop());
    const s = SHIFTS.find((x) => x.id === id);
    if (s) Object.assign(s, body as object, { updated_at: nowIso() });
    return clone(s!) as T;
  }
  if (method === "DELETE" && pathOnly.startsWith("/shifts/")) {
    const id = Number(pathOnly.split("/").pop());
    const idx = SHIFTS.findIndex((x) => x.id === id);
    if (idx >= 0) SHIFTS.splice(idx, 1);
    return undefined as T;
  }
  if (method === "POST" && pathOnly === "/shifts/bulk-approve") {
    const ids = (body as { ids: number[] }).ids;
    const updated = SHIFTS.filter((s) => ids.includes(s.id));
    updated.forEach((s) => (s.status = "approved"));
    return clone(updated) as T;
  }

  if (method === "GET" && pathOnly === "/swaps") return clone(SWAPS) as T;
  if (method === "POST" && pathOnly === "/swaps") {
    const sw: ShiftSwap = {
      id: SWAPS.length + 100,
      requester_id: ME.id,
      target_user_id: (body as { target_user_id: number }).target_user_id,
      requester_shift_id: (body as { requester_shift_id: number }).requester_shift_id,
      target_shift_id: (body as { target_shift_id: number | null }).target_shift_id ?? null,
      status: "pending_peer",
      message: (body as { message?: string }).message ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    SWAPS.push(sw);
    return clone(sw) as T;
  }
  if (method === "POST" && /^\/swaps\/\d+\/(peer-decision|manager-decision|cancel)/.test(pathOnly)) {
    const id = Number(pathOnly.split("/")[2]);
    const sw = SWAPS.find((s) => s.id === id);
    if (!sw) throw new Error("not found");
    const action = pathOnly.split("/")[3];
    const accept = (body as { accept?: boolean })?.accept ?? false;
    if (action === "peer-decision") sw.status = accept ? "pending_manager" : "rejected";
    else if (action === "manager-decision") sw.status = accept ? "approved" : "rejected";
    else if (action === "cancel") sw.status = "canceled";
    sw.updated_at = nowIso();
    return clone(sw) as T;
  }

  if (method === "GET" && pathOnly === "/notifications/vapid-public-key") return { public_key: "MOCK" } as T;
  if (method === "POST" && pathOnly === "/notifications/test") return { sent: 0 } as T;
  if (method === "PUT" && pathOnly === "/notifications/prefs") {
    const b = body as { minutes_before: number; enabled: boolean };
    ME.notify_minutes_before = b.minutes_before;
    ME.notify_enabled = b.enabled;
    return clone(b) as T;
  }

  console.warn(`[mock] unhandled ${method} ${pathOnly}`);
  return undefined as T;
}
