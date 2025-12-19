import AppShell from "../components/AppShell";

export default function Insights() {
  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Insights</h1>
          <div className="muted">분석 기능은 다음 단계에서 연결합니다.</div>
        </div>
      </div>
      <section className="card">
        <h3>Coming next</h3>
        <p className="muted">
          주간 평균, 패턴 분석, 커리어 매칭 인사이트를 연결할 예정입니다.
        </p>
      </section>
    </AppShell>
  );
}
