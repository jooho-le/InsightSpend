import AppShell from "../components/AppShell";

const logs = [
  { date: "2024-06-11", mood: "Focused", context: "Deep work", score: 70 },
  { date: "2024-06-12", mood: "Tense", context: "Client review", score: 45 },
  { date: "2024-06-13", mood: "Relieved", context: "Release done", score: 78 },
  { date: "2024-06-14", mood: "Neutral", context: "Routine tasks", score: 60 },
];

export default function Logs() {
  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Stress Logs</h1>
          <div className="muted">최근 기록을 한 눈에 확인하세요.</div>
        </div>
        <button className="ghost-button">+ New log</button>
      </div>

      <section className="card">
        <h3>Latest entries</h3>
        <div className="log-list">
          {logs.map((log) => (
            <div key={`${log.date}-${log.mood}`} className="log-item">
              <div className="pill">{log.date}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{log.mood}</div>
                <div className="muted">{log.context}</div>
              </div>
              <div className="pill">{log.score}</div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
