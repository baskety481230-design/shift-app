import { NavLink } from "react-router-dom";
import clsx from "clsx";
import type { UserSelf } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { brandStyle } from "@/lib/theme";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  managerOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "シフト", icon: "📅" },
  { to: "/swaps", label: "交代", icon: "🔄" },
  { to: "/approvals", label: "承認", icon: "✅", managerOnly: true },
  { to: "/members", label: "メンバー", icon: "👥", managerOnly: true },
  { to: "/profile", label: "プロフィール", icon: "👤" },
];

export function Layout({ user, children }: { user: UserSelf; children: React.ReactNode }) {
  const { logout } = useAuth();
  const visible = NAV.filter((n) => !n.managerOnly || user.role === "manager");

  return (
    <div className="bg-pattern min-h-full">
      {/* Top bar (PC) */}
      <header className="sticky top-0 z-30 hidden border-b border-ink-200/70 bg-white/80 backdrop-blur md:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg text-white" style={brandStyle(user.theme_color)}>
              <span className="text-sm font-bold">S</span>
            </div>
            <span className="text-base font-semibold tracking-tight">Shift</span>
          </div>
          <nav className="flex items-center gap-1">
            {visible.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "rounded-lg px-3 py-1.5 text-sm transition",
                    isActive ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                clsx("rounded-lg px-3 py-1.5 text-sm", isActive ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100")
              }
            >
              通知
            </NavLink>
            <NavLink
              to="/theme"
              className={({ isActive }) =>
                clsx("rounded-lg px-3 py-1.5 text-sm", isActive ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100")
              }
            >
              デザイン
            </NavLink>
            <button onClick={logout} className="ml-2 rounded-lg px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-100">
              ログアウト
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-ink-200/70 bg-white/90 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md text-white" style={brandStyle(user.theme_color)}>
            <span className="text-xs font-bold">S</span>
          </div>
          <span className="text-sm font-semibold">Shift</span>
        </div>
        <NavLink to="/profile" className="text-sm text-ink-600">
          {user.name}
        </NavLink>
      </header>

      <main className="mx-auto max-w-6xl px-3 pb-24 pt-3 md:px-6 md:pb-10">{children}</main>

      {/* Mobile bottom tab */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200/70 bg-white/95 backdrop-blur md:hidden">
        <ul className="grid grid-cols-5 text-[11px]">
          {visible.slice(0, 5).map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "flex flex-col items-center gap-0.5 py-2 text-ink-400",
                    isActive && "text-ink-900"
                  )
                }
              >
                <span className="text-lg leading-none">{n.icon}</span>
                <span>{n.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
