import { useAuth } from "../auth";

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="login">
      <div className="login-left">
        <div className="brand">InsightSpend</div>
        <div className="login-hero">
          <div className="login-eyebrow">서비스 소개</div>
          <h1 className="login-title">스트레스와 지출을 연결해 회복 루틴을 설계해요.</h1>
          <p className="muted">오늘의 감정을 적으면 소비 패턴과 함께 분석해드려요.</p>
          <div className="intro-stats">
            <div className="intro-stat">
              <span className="intro-stat-value">14일</span>
              <span className="muted">스트레스·지출 추세</span>
            </div>
            <div className="intro-stat">
              <span className="intro-stat-value">3가지</span>
              <span className="muted">핵심 인사이트 제공</span>
            </div>
            <div className="intro-stat">
              <span className="intro-stat-value">1~30분</span>
              <span className="muted">실행 가능한 루틴</span>
            </div>
          </div>
        </div>
        <section className="intro-section">
          <div className="intro-heading">
            <h2>감정이 소비로 번지는 순간을 포착해요.</h2>
            <p className="muted">
              스트레스 점수와 지출을 같은 날짜로 묶어, 소비 급증·카테고리 변화·반복 패턴을 한눈에
              보여줍니다.
            </p>
          </div>
          <div className="intro-grid">
            <article className="intro-card">
              <h3>감정 기록</h3>
              <p className="muted">오늘의 기분·맥락·점수를 남기면 자동으로 정리돼요.</p>
              <ul className="intro-list">
                <li>기분/상황 빠른 선택</li>
                <li>점수 기반 흐름 분석</li>
              </ul>
            </article>
            <article className="intro-card">
              <h3>지출 흐름</h3>
              <p className="muted">최근 14일 평균과 비교해 지출 급증 여부를 확인해요.</p>
              <ul className="intro-list">
                <li>카테고리별 변화</li>
                <li>일별 소비 스파이크</li>
              </ul>
            </article>
            <article className="intro-card">
              <h3>회복 루틴</h3>
              <p className="muted">소비 대신 안정되는 행동을 1~30분 루틴으로 추천해요.</p>
              <ul className="intro-list">
                <li>왜 추천했는지 설명</li>
                <li>바로 실행 가능한 체크리스트</li>
              </ul>
            </article>
          </div>
        </section>
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
