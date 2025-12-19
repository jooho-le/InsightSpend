import { useAuth } from "../auth";

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="login">
      <div className="login-left">
        <div className="brand">InsightSpend</div>
        <h1 style={{ fontSize: 42, margin: 0 }}>
          개인 맞춤 스트레스 리듬을 기록하고,
          <br />
          성장 여정을 설계하세요.
        </h1>
        <p className="muted">
          업무 맥락과 감정 패턴을 함께 기록해 나만의 회복 포인트를 찾습니다.
        </p>
      </div>
      <div className="login-right">
        <div className="login-card">
          <h2 style={{ marginTop: 0 }}>시작하기</h2>
          <p className="muted">Google 계정으로 로그인해 빠르게 시작하세요.</p>
          <button className="primary-button" onClick={() => signInWithGoogle()}>
            Google로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
