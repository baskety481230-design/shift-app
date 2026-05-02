import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Invite, UserManagerView } from "@/types";

export function MembersPage() {
  const qc = useQueryClient();
  const { data: members } = useQuery<UserManagerView[]>({
    queryKey: ["members-manager"],
    queryFn: () => api.get<UserManagerView[]>("/users/manager"),
  });
  const { data: invites } = useQuery<Invite[]>({
    queryKey: ["invites"],
    queryFn: () => api.get<Invite[]>("/users/invites"),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, ...payload }: Partial<UserManagerView> & { id: number }) =>
      api.patch<UserManagerView>(`/users/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members-manager"] }),
  });
  const createInvite = useMutation({
    mutationFn: (payload: { email: string; role: "manager" | "staff" }) =>
      api.post<Invite>("/users/invites", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
  const deleteInvite = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/users/invites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"manager" | "staff">("staff");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-6">
        <h2 className="mb-3 text-base font-semibold">メンバーを招待</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[200px]">
            <span className="mb-1 block text-xs text-ink-600">メールアドレス</span>
            <input className="w-full" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="staff@example.com" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-ink-600">役割</span>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as "manager" | "staff")}>
              <option value="staff">スタッフ</option>
              <option value="manager">店長</option>
            </select>
          </label>
          <button
            onClick={() => { if (newEmail) { createInvite.mutate({ email: newEmail, role: newRole }); setNewEmail(""); } }}
            disabled={!newEmail}
            className="btn btn-primary"
          >
            招待を発行
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-400">
          招待されたメールアドレスのGoogleアカウントでログインすると、自動的に参加できます。
        </p>
      </div>

      <div className="card">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold">招待中</div>
        <div className="divide-y divide-ink-200/70">
          {(invites ?? []).filter((i) => !i.used).length === 0 && (
            <div className="px-5 py-4 text-sm text-ink-400">未使用の招待はありません</div>
          )}
          {(invites ?? []).filter((i) => !i.used).map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
              <span className="font-mono text-sm">{inv.email}</span>
              <span className="chip chip-draft">{inv.role === "manager" ? "店長" : "スタッフ"}</span>
              <button onClick={() => deleteInvite.mutate(inv.id)} className="ml-auto btn btn-ghost text-rose-600">取消</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="border-b border-ink-200 px-5 py-3 text-sm font-semibold">参加中のメンバー</div>
        <div className="divide-y divide-ink-200/70">
          {(members ?? []).map((m) => (
            <MemberRow
              key={m.id}
              user={m}
              onSave={(payload) => updateUser.mutate({ id: m.id, ...payload })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ user, onSave }: { user: UserManagerView; onSave: (p: Partial<UserManagerView>) => void }) {
  const [wage, setWage] = useState(user.hourly_wage);
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.is_active);
  const dirty = wage !== user.hourly_wage || role !== user.role || active !== user.is_active;

  return (
    <div className="grid grid-cols-1 gap-2 px-5 py-3 sm:grid-cols-[1fr_120px_120px_120px_auto] sm:items-center">
      <div>
        <div className="text-sm font-medium">{user.name}</div>
        <div className="text-[11px] text-ink-400">{user.email}</div>
      </div>
      <label className="flex items-center gap-2 text-xs text-ink-600">
        時給
        <input type="number" min={0} step={10} value={wage} onChange={(e) => setWage(Number(e.target.value))} className="w-20" />
      </label>
      <label className="flex items-center gap-2 text-xs text-ink-600">
        役割
        <select value={role} onChange={(e) => setRole(e.target.value as "manager" | "staff")}>
          <option value="staff">スタッフ</option>
          <option value="manager">店長</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-ink-600">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
        在籍中
      </label>
      <button
        onClick={() => onSave({ hourly_wage: wage, role, is_active: active })}
        disabled={!dirty}
        className="btn btn-primary"
      >
        保存
      </button>
    </div>
  );
}
