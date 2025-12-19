import AppShell from "../components/AppShell";

const moodTrend = [30, 55, 70, 40, 85, 60, 50];
const recentLogs = [
  { date: "Mon", mood: "Calm", note: "팀 미팅 마무리", score: 72 },
  { date: "Tue", mood: "Tense", note: "마감 임박", score: 48 },
  { date: "Wed", mood: "Balanced", note: "운동 후 집중", score: 66 },
];

export default function Dashboard() {
  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="muted">이번 주 스트레스 흐름과 회복 지표</div>
        </div>
        <button className="ghost-button">+ Add log</button>
      </div>

      <section className="hero">
        <div>
          <h2>오늘의 리듬을 정리하고 회복 전략을 설계하세요.</h2>
          <p>
            지난 7일 동안 평균 스트레스 점수는 61점입니다. 회복 지수를
            유지하려면 2일에 한 번 짧은 휴식 루틴을 추천합니다.
          </p>
        </div>
        <div className="hero-metric">
          <div className="muted">Recovery index</div>
          <div className="stat">74</div>
          <div className="muted">+6% vs last week</div>
        </div>
      </section>

      <section className="grid three">
        <div className="card">
          <h3>Weekly Avg</h3>
          <div className="stat">61</div>
          <div className="muted">평균 스트레스 점수</div>
        </div>
        <div className="card">
          <h3>Peak Moment</h3>
          <div className="stat">Tue 4PM</div>
          <div className="muted">가장 높은 긴장 구간</div>
        </div>
        <div className="card">
          <h3>Focus Streak</h3>
          <div className="stat">3 days</div>
          <div className="muted">연속 안정 세션</div>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h3>7-day Mood Trend</h3>
          <div className="bars">
            {moodTrend.map((value, index) => (
              <div
                key={`${value}-${index}`}
                className="bar"
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Recent Logs</h3>
          <div className="log-list">
            {recentLogs.map((log) => (
              <div key={`${log.date}-${log.mood}`} className="log-item">
                <div className="pill">{log.date}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{log.mood}</div>
                  <div className="muted">{log.note}</div>
                </div>
                <div className="pill">{log.score}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
