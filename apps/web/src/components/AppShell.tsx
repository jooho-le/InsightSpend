import { NavLink } from "react-router-dom";
import { useAuth } from "../auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOutUser } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">InsightSpend</div>
        <nav className="nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => (isActive ? "active" : "")}>
            Stress Logs
          </NavLink>
          <NavLink to="/finance" className={({ isActive }) => (isActive ? "active" : "")}>
            Finance
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => (isActive ? "active" : "")}>
            Empathy Chat
          </NavLink>
          <NavLink to="/insights" className={({ isActive }) => (isActive ? "active" : "")}>
            Insights
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
            Settings
          </NavLink>
        </nav>
        <div className="sidebar-card">
          <div style={{ fontSize: 12, opacity: 0.7 }}>Signed in as</div>
          <div style={{ fontWeight: 600, margin: "6px 0" }}>
            {user?.displayName || "Anonymous"}
          </div>
          <button className="ghost-button" onClick={() => signOutUser()}>
            Log out
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
