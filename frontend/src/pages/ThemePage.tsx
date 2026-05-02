import { useState } from "react";
import clsx from "clsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { applyTheme, THEME_COLORS, THEME_PATTERNS } from "@/lib/theme";
import type { UserSelf } from "@/types";

export function ThemePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [color, setColor] = useState(user!.theme_color);
  const [pattern, setPattern] = useState(user!.theme_pattern);

  function preview(c: number, p: number) {
    setColor(c);
    setPattern(p);
    applyTheme(c, p);
  }

  const save = useMutation({
    mutationFn: () => api.patch<UserSelf>("/users/me", { theme_color: color, theme_pattern: pattern }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-6">
        <h2 className="mb-1 text-base font-semibold">テーマカラー</h2>
        <p className="mb-4 text-xs text-ink-400">アプリ全体のアクセントカラーになります（12色）</p>
        <div className="grid grid-cols-6 gap-3 sm:grid-cols-12">
          {THEME_COLORS.map((c, i) => (
            <button
              key={c.name}
              onClick={() => preview(i, pattern)}
              title={c.name}
              className={clsx(
                "h-10 w-10 rounded-full ring-2 ring-offset-2 transition",
                color === i ? "ring-ink-900" : "ring-transparent hover:ring-ink-200"
              )}
              style={{ backgroundColor: `hsl(${c.h} ${c.s}% ${c.l}%)` }}
            />
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-1 text-base font-semibold">パターン（柄）</h2>
        <p className="mb-4 text-xs text-ink-400">背景に適用される控えめな模様（20種）</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {THEME_PATTERNS.map((p, i) => (
            <button
              key={p.name}
              onClick={() => preview(color, i)}
              className={clsx(
                "rounded-xl border bg-white p-3 text-left transition",
                pattern === i ? "border-ink-900 shadow-card" : "border-ink-200 hover:border-ink-400"
              )}
            >
              <div
                className="mb-2 h-12 w-full rounded-md"
                style={{ backgroundImage: p.css, backgroundColor: "white" }}
              />
              <span className="text-xs text-ink-600">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => preview(user!.theme_color, user!.theme_pattern)}
          className="btn btn-ghost"
        >
          リセット
        </button>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="btn btn-primary"
        >
          保存して適用
        </button>
      </div>
    </div>
  );
}
