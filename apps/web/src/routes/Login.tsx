import { useAuth } from "../auth";

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div style={{ padding: 32, maxWidth: 420 }}>
      <h1>InsightSpend</h1>
      <p>Google 계정으로 로그인해서 스트레스 기록을 시작하세요.</p>
      <button
        onClick={() => signInWithGoogle()}
        style={{ padding: "10px 16px", fontSize: 16 }}
      >
        Google로 로그인
      </button>
    </div>
  );
}
