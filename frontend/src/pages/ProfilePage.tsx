import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { brandStyle } from "@/lib/theme";
import type { UserSelf } from "@/types";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState(user!.name);
  const [comment, setComment] = useState(user!.comment ?? "");
  const [avatar, setAvatar] = useState(user!.avatar_url ?? "");
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (payload: Partial<UserSelf>) => api.patch<UserSelf>("/users/me", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card overflow-hidden">
        <div className="h-24 bg-pattern" style={brandStyle(user!.theme_color)} />
        <div className="-mt-10 flex flex-col items-center gap-3 px-6 pb-6">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-3xl font-bold text-ink-900 ring-4 ring-white shadow-card overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span style={{ color: `hsl(var(--brand-h) var(--brand-s) var(--brand-l))` }}>{name.slice(0, 1)}</span>
            )}
          </div>
          <div className="text-center">
            <div className="text-base font-semibold">{name}</div>
            <div className="text-xs text-ink-400">{user!.email} · {user!.role === "manager" ? "店長" : "スタッフ"}</div>
          </div>
          <p className="rounded-xl bg-ink-100/70 px-4 py-2 text-center text-sm text-ink-600 max-w-md">
            {comment || "ひとことコメント未設定"}
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold">プロフィールを編集</h2>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-600">表示名</span>
          <input className="w-full" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-600">トップ画像URL</span>
          <input className="w-full" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
          <span className="mt-1 block text-[11px] text-ink-400">※ Googleアバターが自動設定されています。変更したい場合は画像URLを入れてください。</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-600">ひとことコメント</span>
          <textarea rows={3} className="w-full" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={140} placeholder="顔と名前を覚えやすいよう自由に紹介を書いてください" />
          <span className="mt-1 block text-right text-[11px] text-ink-400">{comment.length}/140</span>
        </label>

        <div className="flex items-center justify-between pt-2">
          <button onClick={logout} className="btn btn-ghost text-rose-600">ログアウト</button>
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-emerald-600">保存しました</span>}
            <button
              onClick={() => save.mutate({ name, comment, avatar_url: avatar || null })}
              disabled={save.isPending}
              className="btn btn-primary"
            >
              保存
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-3 text-base font-semibold">給与情報</h2>
        <div className="rounded-xl bg-ink-100/70 px-4 py-3 text-sm">
          時給: <span className="font-semibold">¥{user!.hourly_wage.toLocaleString()}</span>
          <p className="mt-1 text-[11px] text-ink-400">時給は店長のみ変更できます。同僚には表示されません。</p>
        </div>
      </div>
    </div>
  );
}
