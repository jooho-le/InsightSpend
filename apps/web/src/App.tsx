import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Dashboard from "./routes/Dashboard";
import Insights from "./routes/Insights";
import Login from "./routes/Login";
import Logs from "./routes/Logs";
import Settings from "./routes/Settings";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/logs"
        element={user ? <Logs /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/insights"
        element={user ? <Insights /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/settings"
        element={user ? <Settings /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}
