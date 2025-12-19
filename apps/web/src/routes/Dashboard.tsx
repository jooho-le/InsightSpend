import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { StressLog } from "../models";
import { routineTemplate } from "../promptTemplates";

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
  const [weekLogs, setWeekLogs] = useState<StressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ displayName: string; jobType: string }>({
    displayName: "",
    jobType: "",
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    mood: "",
    context: "",
    memo: "",
    score: "",
  });

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

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

    const logsUnsub = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<StressLog, "id">),
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
        setWeekLogs(logs);
        setRecent(logs.slice(-3).reverse());
        setLastSyncedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
        setLoading(false);
      },
      () => {
        setError("최근 7일 데이터를 불러오지 못했습니다.");
        setLoading(false);
      }
    );

    const profileRef = doc(db, "users", user.uid);
    const profileUnsub = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as { displayName?: string; jobType?: string };
          setProfile({
            displayName: data.displayName ?? user.displayName ?? "Anonymous",
            jobType: data.jobType ?? "",
          });
        } else {
          setProfile({
            displayName: user.displayName ?? "Anonymous",
            jobType: "",
          });
        }
        setLastSyncedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      },
      () => {
        setProfile({
          displayName: user.displayName ?? "Anonymous",
          jobType: "",
        });
      }
    );

    return () => {
      logsUnsub();
      profileUnsub();
    };
  }, [user]);

  const weeklyAvg = useMemo(() => {
    const scores = trend.map((item) => item.score).filter((score) => score > 0);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    return Math.round(sum / scores.length);
  }, [trend]);

  const { maxScore, minScore } = useMemo(() => {
    const scores = trend.map((item) => item.score).filter((score) => score > 0);
    if (scores.length === 0) {
      return { maxScore: 0, minScore: 0 };
    }
    return {
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
    };
  }, [trend]);

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

  const recoveryIndex = useMemo(() => {
    if (!weeklyAvg) return null;
    return Math.max(0, 100 - weeklyAvg);
  }, [weeklyAvg]);

  const latestLogDate = useMemo(() => {
    if (weekLogs.length === 0) return null;
    const latest = weekLogs[weekLogs.length - 1];
    return latest.date;
  }, [weekLogs]);

  const latestLogDateLabel = useMemo(() => {
    if (!latestLogDate) return "최근 로그 없음";
    const [year, month, day] = latestLogDate.split("-");
    return `${month}.${day}`;
  }, [latestLogDate]);

  const insightSummary = useMemo(() => {
    if (weekLogs.length === 0) {
      return "최근 7일 기록이 없어 기본 루틴을 제안합니다.";
    }
    const avgText = `지난 7일 평균 스트레스 점수는 ${weeklyAvg}점입니다.`;
    const focusText =
      weeklyAvg >= 70
        ? "이번 주는 회복 시간을 확보하는 것이 중요합니다."
        : "이번 주는 집중 리듬을 유지하는 것이 중요합니다.";
    return `${avgText} ${focusText}`;
  }, [weekLogs.length, weeklyAvg]);

  const addLog = async () => {
    if (!user) return;
    setAddError(null);
    const scoreValue = Number(addForm.score);
    if (!addForm.date || !addForm.mood || !addForm.context || Number.isNaN(scoreValue)) {
      setAddError("필수 값을 입력하세요.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "stressLogs"), {
        uid: user.uid,
        date: addForm.date,
        mood: addForm.mood,
        context: addForm.context,
        memo: addForm.memo,
        score: scoreValue,
        createdAt: serverTimestamp(),
      });
      setAddForm({
        date: new Date().toISOString().slice(0, 10),
        mood: "",
        context: "",
        memo: "",
        score: "",
      });
      setShowAdd(false);
      setLoading(true);
      setError(null);
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
      const logs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<StressLog, "id">),
      }));
      setWeekLogs(logs);
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
      setAddError("로그 추가에 실패했습니다.");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="muted">이번 주 스트레스 흐름과 회복 지표</div>
        </div>
        <button className="ghost-button" onClick={() => setShowAdd((prev) => !prev)}>
          + Add log
        </button>
      </div>

      {loading && <div className="card">데이터를 불러오는 중...</div>}
      {error && <div className="card">{error}</div>}

      {showAdd && (
        <section className="card">
          <h3>최근 기록 추가</h3>
          <div className="form-grid">
            <label>
              Date
              <input
                className="input"
                type="date"
                value={addForm.date}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, date: event.target.value }))
                }
              />
            </label>
            <label>
              Mood
              <input
                className="input"
                value={addForm.mood}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, mood: event.target.value }))
                }
              />
            </label>
            <label>
              Context
              <input
                className="input"
                value={addForm.context}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, context: event.target.value }))
                }
              />
            </label>
            <label>
              Memo
              <input
                className="input"
                value={addForm.memo}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, memo: event.target.value }))
                }
              />
            </label>
            <label>
              Score
              <input
                className="input"
                type="number"
                value={addForm.score}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, score: event.target.value }))
                }
              />
            </label>
          </div>
          {addError && <div className="muted">{addError}</div>}
          <div className="button-row">
            <button className="primary-button" onClick={addLog} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
            <button className="secondary-button" onClick={() => setShowAdd(false)}>
              닫기
            </button>
          </div>
        </section>
      )}

      <section className="hero">
        <div>
          <h2>이번 주 리듬을 빠르게 정리하세요.</h2>
          <p>
            {insightSummary} {routineText}
          </p>
          <div className="muted" style={{ marginTop: 12 }}>
            최근 로그: {latestLogDateLabel} · 기록 수: {weekLogs.length.toLocaleString()}건
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            프로필: {profile.displayName || "-"} · 직종: {profile.jobType || "-"} ·
            실시간 동기화 중
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            마지막 동기화: {lastSyncedAt ?? "-"}
          </div>
        </div>
        <div className="hero-metric">
          <div className="muted">Recovery index</div>
          <div className="stat">{recoveryIndex ?? "-"}</div>
          <div className="muted">최근 7일 기준</div>
        </div>
      </section>

      <section className="grid three">
        <div className="card">
          <h3>Weekly Avg</h3>
          <div className="stat">{weekLogs.length === 0 ? "-" : weeklyAvg || "-"}</div>
          <div className="muted">
            {weekLogs.length === 0 ? "최근 기록이 없습니다." : "평균 스트레스 점수"}
          </div>
        </div>
        <div className="card">
          <h3>Max / Min</h3>
          <div className="stat">
            {weekLogs.length === 0 ? "-" : maxScore || "-"} /{" "}
            {weekLogs.length === 0 ? "-" : minScore || "-"}
          </div>
          <div className="muted">
            {weekLogs.length === 0 ? "최근 기록이 없습니다." : "이번 주 최고/최저 점수"}
          </div>
        </div>
        <div className="card">
          <h3>Top Moods</h3>
          <div className="stat">{topMoods[0]?.[0] || "-"}</div>
          <div className="muted">
            {topMoods.length === 0 ? "최근 기록이 없습니다." : "가장 많이 기록된 감정"}
          </div>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h3>7-day Mood Trend</h3>
          {weekLogs.length === 0 ? (
            <div className="muted">최근 7일 기록이 없습니다.</div>
          ) : (
            <>
              <div className="bars">
                {trend.map((point, index) => (
                  <div
                    key={`${point.date || "day"}-${index}`}
                    className="bar"
                    style={{ height: `${Math.max(point.score, 5)}%` }}
                    title={`${point.date}: ${point.score}`}
                  />
                ))}
              </div>
              <div className="trend-labels">
                {trend.map((point, index) => (
                  <span key={`${point.date || "day"}-${index}`}>{point.date.slice(5)}</span>
                ))}
              </div>
            </>
          )}
        </div>
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
      </section>

      <section className="grid two">
        <div className="card">
          <h3>{routineTemplate.header}</h3>
          <p className="muted">
            {weekLogs.length === 0 ? "최근 기록이 없어 기본 루틴을 제안합니다." : routineText}
          </p>
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
