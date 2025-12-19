import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Dashboard from "./routes/Dashboard";
import Login from "./routes/Login";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={user ? <Dashboard /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
}
