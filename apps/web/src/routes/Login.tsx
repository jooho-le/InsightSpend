import { useAuth } from "../auth";

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="login">
      <div className="login-left">
        <div className="brand">InsightSpend</div>
        <h1 style={{ fontSize: 40, margin: 0 }}>스트레스와 지출을 연결해 회복 루틴을 설계해요.</h1>
        <p className="muted">오늘의 감정을 적으면 소비 패턴과 함께 분석해드려요.</p>
      </div>
      <div className="login-right">
        <div className="login-card">
          <h2 style={{ marginTop: 0 }}>시작하기</h2>
          <p className="muted">구글 계정으로 10초 만에 시작할 수 있어요.</p>
          <button className="primary-button" onClick={() => signInWithGoogle()}>
            Google로 계속하기
          </button>
        </div>
      </div>
    </div>
  );
}
