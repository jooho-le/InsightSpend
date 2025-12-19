import { useAuth } from "../auth";

export default function Dashboard() {
  const { user, signOutUser } = useAuth();

  return (
    <div style={{ padding: 32 }}>
      <h1>Dashboard</h1>
      <p>로그인 성공! 다음 단계에서 스트레스 대시보드를 구현합니다.</p>
      <div style={{ marginTop: 16 }}>
        <div>이름: {user?.displayName || "-"}</div>
        <div>이메일: {user?.email || "-"}</div>
        <div>UID: {user?.uid}</div>
      </div>
      <button
        onClick={() => signOutUser()}
        style={{ marginTop: 20, padding: "8px 12px" }}
      >
        로그아웃
      </button>
    </div>
  );
}
