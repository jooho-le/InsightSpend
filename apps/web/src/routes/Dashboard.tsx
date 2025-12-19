import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { StressLog } from "../models";

type TrendPoint = {
  date: string;
  score: number;
};

const emptyTrend: TrendPoint[] = Array.from({ length: 7 }).map((_, index) => ({
  date: "",
  score: 0,
}));

export default function Dashboard() {
  const { user } = useAuth();
  const [trend, setTrend] = useState<TrendPoint[]>(emptyTrend);
  const [recent, setRecent] = useState<StressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 6);
        const startDate = start.toISOString().slice(0, 10);

        const logsQuery = query(
          collection(db, "stressLogs"),
          where("uid", "==", user.uid),
          where("date", ">=", startDate),
          orderBy("date", "asc")
        );
        const snapshot = await getDocs(logsQuery);
        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<StressLog, "id">),
        }));

        const trendMap = new Map<string, number>();
        logs.forEach((log) => {
          trendMap.set(log.date, log.score);
        });

        const nextTrend = Array.from({ length: 7 }).map((_, index) => {
          const date = new Date(start);
          date.setDate(start.getDate() + index);
          const key = date.toISOString().slice(0, 10);
          return {
            date: key,
            score: trendMap.get(key) ?? 0,
          };
        });

        setTrend(nextTrend);
        setRecent(logs.slice(-3).reverse());
      } catch (err) {
        setError("최근 7일 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const weeklyAvg = useMemo(() => {
    const scores = trend.map((item) => item.score).filter((score) => score > 0);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    return Math.round(sum / scores.length);
  }, [trend]);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="muted">이번 주 스트레스 흐름과 회복 지표</div>
        </div>
        <button className="ghost-button">+ Add log</button>
      </div>

      {loading && <div className="card">데이터를 불러오는 중...</div>}
      {error && <div className="card">{error}</div>}

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
          <div className="stat">{weeklyAvg || "-"}</div>
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
            {trend.map((point, index) => (
              <div
                key={`${point.date}-${index}`}
                className="bar"
                style={{ height: `${Math.max(point.score, 5)}%` }}
                title={`${point.date}: ${point.score}`}
              />
            ))}
          </div>
          <div className="trend-labels">
            {trend.map((point) => (
              <span key={point.date}>{point.date.slice(5)}</span>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Recent Logs</h3>
          <div className="log-list">
            {recent.length === 0 && (
              <div className="muted">최근 기록이 없습니다.</div>
            )}
            {recent.map((log) => (
              <div key={log.id} className="log-item">
                <div className="pill">{log.date.slice(5)}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{log.mood}</div>
                  <div className="muted">{log.context}</div>
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
