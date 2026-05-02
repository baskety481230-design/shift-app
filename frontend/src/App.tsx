import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/LoginPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { SwapsPage } from "@/pages/SwapsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ThemePage } from "@/pages/ThemePage";
import { MembersPage } from "@/pages/MembersPage";
import { ApprovalsPage } from "@/pages/ApprovalsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-ink-400">
        読み込み中…
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout user={user}>
      <Routes>
        <Route path="/" element={<CalendarPage />} />
        <Route path="/swaps" element={<SwapsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/theme" element={<ThemePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        {user.role === "manager" && <Route path="/members" element={<MembersPage />} />}
        {user.role === "manager" && <Route path="/approvals" element={<ApprovalsPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
