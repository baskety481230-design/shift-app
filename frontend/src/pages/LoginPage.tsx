import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { loginUrl } = useAuth();
  const [params] = useSearchParams();
  const error = params.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6 text-white">
      <div className="w-full max-w-sm rounded-3xl bg-white/[0.06] p-8 backdrop-blur-md ring-1 ring-white/10">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500">
            <span className="text-lg font-bold">S</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Shift</h1>
            <p className="text-xs text-white/60">バイトのシフト、もうひと工夫。</p>
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-white/70">
          Googleアカウントでログインしてください。<br />
          ※ 店長から招待されたメールアドレスのみ参加できます。
        </p>

        <a
          href={loginUrl}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
        >
          <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 1 1-3.4-13l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 4.9l6.2 5.2C41 35 44 30 44 24c0-1.2-.1-2.4-.4-3.5z"/>
          </svg>
          Googleでログイン
        </a>

        {error === "not_invited" && (
          <p className="mt-4 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
            このアカウントは招待されていません。店長に招待を依頼してください。
          </p>
        )}

        <p className="mt-8 text-center text-[11px] text-white/40">
          ログインで本サービスの利用条件に同意したものとみなします
        </p>
      </div>
    </div>
  );
}
