import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { ensurePushSubscription, disablePushSubscription, sendTestPush } from "@/lib/push";

const PRESET_MINUTES = [15, 30, 60, 90, 120, 180, 360, 720];

export function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [minutes, setMinutes] = useState(user!.notify_minutes_before);
  const [enabled, setEnabled] = useState(user!.notify_enabled);
  const [status, setStatus] = useState<string>("");

  const save = useMutation({
    mutationFn: () =>
      api.put("/notifications/prefs", { minutes_before: minutes, enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      setStatus("保存しました");
      setTimeout(() => setStatus(""), 1500);
    },
  });

  async function handleEnable() {
    setStatus("ブラウザに権限を要求しています…");
    const sub = await ensurePushSubscription();
    setStatus(sub ? "通知を有効化しました" : "通知を有効化できませんでした（ブラウザ設定をご確認ください）");
  }
  async function handleDisable() {
    await disablePushSubscription();
    setStatus("この端末の通知を解除しました");
  }
  async function handleTest() {
    try {
      const r = await sendTestPush();
      setStatus(`テスト送信: ${r.sent} 件`);
    } catch {
      setStatus("通知の登録がありません。先に「この端末で通知を有効化」してください");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-6">
        <h2 className="mb-1 text-base font-semibold">通知の許可</h2>
        <p className="mb-4 text-xs text-ink-400">この端末でWeb Pushを受け取れるようにします（PWAとしてインストール後の使用を推奨）</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleEnable} className="btn btn-primary">この端末で通知を有効化</button>
          <button onClick={handleDisable} className="btn btn-outline">この端末の通知を解除</button>
          <button onClick={handleTest} className="btn btn-ghost">テスト送信</button>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold">アラーム時間の設定</h2>
        <label className="flex items-center justify-between">
          <span className="text-sm">通知を受け取る</span>
          <input type="checkbox" className="h-5 w-5" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </label>
        <div>
          <div className="mb-2 text-sm">シフト開始の <span className="font-semibold">{minutes}</span> 分前</div>
          <input
            type="range"
            min={0}
            max={720}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
            className="w-full"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_MINUTES.map((m) => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100"
              >
                {m >= 60 ? `${m / 60}時間` : `${m}分`}前
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {status && <span className="text-xs text-ink-600">{status}</span>}
          <button onClick={() => save.mutate()} disabled={save.isPending} className="btn btn-primary">保存</button>
        </div>
      </div>
    </div>
  );
}
