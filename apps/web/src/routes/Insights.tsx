import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { StressLog } from "../models";
import { routineTemplate } from "../promptTemplates";

export default function Insights() {
  const { user } = useAuth();
  const [weekLogs, setWeekLogs] = useState<StressLog[]>([]);
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
        setWeekLogs(logs);
      } catch (err) {
        setError("인사이트 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const weeklyAvg = useMemo(() => {
    const scores = weekLogs.map((log) => log.score).filter((score) => score > 0);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    return Math.round(sum / scores.length);
  }, [weekLogs]);

  const { maxScore, minScore } = useMemo(() => {
    const scores = weekLogs.map((log) => log.score).filter((score) => score > 0);
    if (scores.length === 0) {
      return { maxScore: 0, minScore: 0 };
    }
    return {
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
    };
  }, [weekLogs]);

  const topMoods = useMemo(() => {
    const freq = new Map<string, number>();
    weekLogs.forEach((log) => {
      const key = log.mood.trim();
      if (!key) return;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    });
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [weekLogs]);

  const routineText = useMemo(() => {
    const topMood = topMoods[0]?.[0] ?? "Neutral";
    const focus = weeklyAvg >= 70 ? "회복 시간을 확보하는 것" : "집중 리듬을 유지하는 것";
    const actions =
      weeklyAvg >= 70
        ? "짧은 휴식, 수분 보충, 퇴근 전 10분 스트레칭"
        : "작은 목표 설정, 20분 집중 세션, 저녁 산책";

    return routineTemplate.prompt
      .replace("{{topMood}}", topMood)
      .replace("{{avg}}", weeklyAvg ? String(weeklyAvg) : "0")
      .replace("{{focus}}", focus)
      .replace("{{actions}}", actions);
  }, [topMoods, weeklyAvg]);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Insights</h1>
          <div className="muted">이번 주 스트레스 패턴을 정리했습니다.</div>
        </div>
      </div>

      {loading && <div className="card">불러오는 중...</div>}
      {error && <div className="card">{error}</div>}

      <section className="grid three">
        <div className="card">
          <h3>Weekly Avg</h3>
          <div className="stat">{weeklyAvg || "-"}</div>
          <div className="muted">평균 스트레스 점수</div>
        </div>
        <div className="card">
          <h3>Max / Min</h3>
          <div className="stat">
            {maxScore || "-"} / {minScore || "-"}
          </div>
          <div className="muted">이번 주 최고/최저 점수</div>
        </div>
        <div className="card">
          <h3>Top Moods</h3>
          <div className="stat">{topMoods[0]?.[0] || "-"}</div>
          <div className="muted">가장 많이 기록된 감정</div>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h3>Mood Top3</h3>
          <div className="insight-list">
            {topMoods.length === 0 && <div className="muted">기록된 감정이 없습니다.</div>}
            {topMoods.map(([mood, count]) => (
              <div key={mood} className="insight-row">
                <span>{mood}</span>
                <span className="pill">{count}회</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>{routineTemplate.header}</h3>
          <p className="muted">{routineText}</p>
        </div>
      </section>
    </AppShell>
  );
}
