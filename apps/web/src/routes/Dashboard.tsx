import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { AiInsight, FinanceLog, StressLog } from "../models";
import { isAiConfigured } from "../ai";
import { ensureDailyAiInsight, normalizeAiInsight } from "../utils/aiInsights";
import { buildDateRange, computeDailySummary } from "../utils/dailySummary";

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
  const [stress14Logs, setStress14Logs] = useState<StressLog[]>([]);
  const [financeLogs, setFinanceLogs] = useState<FinanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ displayName: string; jobType: string }>({
    displayName: "",
    jobType: "",
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const dailySummaries = useMemo(() => {
    if (!user) return [];
    const dates = buildDateRange(14);
    return dates.map((date) =>
      computeDailySummary(user.uid, date, stress14Logs, financeLogs)
    );
  }, [financeLogs, stress14Logs, user]);

  const latestSummary = useMemo(() => {
    const reversed = [...dailySummaries].reverse();
    return (
      reversed.find((summary) => summary.stressCount > 0 || summary.dailyExpense > 0) ||
      dailySummaries[dailySummaries.length - 1] ||
      null
    );
  }, [dailySummaries]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);
    const startDate = start.toISOString().slice(0, 10);
    const start14 = new Date();
    start14.setDate(today.getDate() - 13);
    const start14Date = start14.toISOString().slice(0, 10);
    const start28 = new Date();
    start28.setDate(today.getDate() - 27);
    const start28Date = start28.toISOString().slice(0, 10);

    const logsQuery = query(
      collection(db, "stressLogs"),
      where("uid", "==", user.uid)
    );

    const logsUnsub = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<StressLog, "id">),
        }));
        const weekLogs = logs
          .filter((log) => log.date && log.date >= startDate)
          .sort((a, b) => a.date.localeCompare(b.date));

        const trendMap = new Map<string, number>();
        weekLogs.forEach((log) => {
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
        setWeekLogs(weekLogs);
        setRecent(weekLogs.slice(-3).reverse());
        setLastSyncedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
        setLoading(false);
      },
      (err) => {
        console.error("Dashboard week logs snapshot failed:", err);
        setError("최근 7일 기록을 불러오지 못했어요.");
        setLoading(false);
      }
    );

    const stress14Query = query(
      collection(db, "stressLogs"),
      where("uid", "==", user.uid)
    );

    const stress14Unsub = onSnapshot(
      stress14Query,
      (snapshot) => {
        const logs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<StressLog, "id">),
        }));
        const recentLogs = logs
          .filter((log) => log.date && log.date >= start14Date)
          .sort((a, b) => a.date.localeCompare(b.date));
        setStress14Logs(recentLogs);
        setLastSyncedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      },
      (err) => {
        console.error("Dashboard 14-day logs snapshot failed:", err);
        setError("최근 14일 기록을 불러오지 못했어요.");
      }
    );

    const financeQuery = query(
      collection(db, "financeLogs"),
      where("uid", "==", user.uid)
    );

    const financeUnsub = onSnapshot(
      financeQuery,
      (snapshot) => {
        const logs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FinanceLog, "id">),
        }));
        const recentLogs = logs
          .filter((log) => log.date && log.date >= start28Date)
          .sort((a, b) => a.date.localeCompare(b.date));
        setFinanceLogs(recentLogs);
        setLastSyncedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      },
      (err) => {
        console.error("Dashboard finance logs snapshot failed:", err);
        setError("지출 데이터를 불러오지 못했어요.");
      }
    );

    const profileRef = doc(db, "users", user.uid);
    const profileUnsub = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as { displayName?: string; jobType?: string };
          setProfile({
            displayName: data.displayName ?? user.displayName ?? "익명",
            jobType: data.jobType ?? "",
          });
        } else {
          setProfile({
            displayName: user.displayName ?? "익명",
            jobType: "",
          });
        }
        setLastSyncedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      },
      () => {
        setProfile({
          displayName: user.displayName ?? "익명",
          jobType: "",
        });
      }
    );

    return () => {
      logsUnsub();
      stress14Unsub();
      financeUnsub();
      profileUnsub();
    };
  }, [user]);

  const weeklyAvg = useMemo(() => {
    const scores = trend.map((item) => item.score).filter((score) => score > 0);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    return Math.round(sum / scores.length);
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
    if (!latestLogDate) return "최근 기록 없음";
    const [year, month, day] = latestLogDate.split("-");
    return `${month}.${day}`;
  }, [latestLogDate]);

  const financeTopCategory = useMemo(() => {
    const totals = new Map<string, number>();
    dailySummaries.forEach((summary) => {
      summary.topCategories.forEach((entry) => {
        const key = entry.category.trim() || "Other";
        totals.set(key, (totals.get(key) ?? 0) + entry.amount);
      });
    });
    const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? "기타";
  }, [dailySummaries]);

  const avgExpense14 = useMemo(() => {
    if (dailySummaries.length === 0) return 0;
    const total = dailySummaries.reduce((acc, summary) => acc + summary.dailyExpense, 0);
    return Math.round(total / dailySummaries.length);
  }, [dailySummaries]);

  const spendSurge = useMemo(() => {
    if (avgExpense14 === 0) return false;
    const lastSummary = latestSummary;
    if (!lastSummary) return false;
    return lastSummary.dailyExpense >= avgExpense14 * 1.5;
  }, [avgExpense14, latestSummary]);

  const spendSurgeLabel = useMemo(() => {
    if (!latestSummary) return "데이터 필요";
    if (avgExpense14 === 0 && latestSummary.dailyExpense === 0) return "데이터 필요";
    return spendSurge ? "감지됨" : "안정적";
  }, [avgExpense14, latestSummary, spendSurge]);

  const summaryRecommendation = useMemo(() => {
    return aiInsight?.recommendations[0] ?? null;
  }, [aiInsight]);

  const summaryReason = useMemo(() => {
    if (summaryRecommendation?.reason) return summaryRecommendation.reason;
    const stressHigh = (latestSummary?.stressScoreMax ?? 0) >= 70;
    if (stressHigh && spendSurge) {
      return `스트레스↑ + 지출↑(${financeTopCategory})라서…`;
    }
    if (stressHigh) return "스트레스가 높아서 빠른 리셋이 필요해요.";
    if (spendSurge) return `최근 평균보다 지출이 늘었어요 (${financeTopCategory}).`;
    return "루틴 하나로 리듬을 유지해볼까요?";
  }, [financeTopCategory, latestSummary, spendSurge, summaryRecommendation]);

  const highStressDays = useMemo(() => {
    return dailySummaries
      .filter((summary) => summary.stressScoreMax >= 70)
      .sort((a, b) => b.stressScoreMax - a.stressScoreMax)
      .slice(0, 3);
  }, [dailySummaries]);

  const insightText = useMemo(() => {
    if (dailySummaries.length === 0) {
      return "오늘 한 줄만 적어볼래요?";
    }
    const stressText =
      highStressDays.length > 0
        ? `고스트레스 날: ${highStressDays.length}일`
        : "고스트레스 날은 아직 없어요.";
    const spendText = spendSurge
      ? "최근 2주 대비 지출이 늘었어요."
      : "최근 2주 지출은 안정적이에요.";
    const categoryText = `가장 많이 쓴 카테고리: ${financeTopCategory}`;
    return `${stressText} · ${spendText} · ${categoryText}`;
  }, [dailySummaries.length, financeTopCategory, highStressDays.length, spendSurge]);

  const insightSummary = useMemo(() => {
    if (dailySummaries.length === 0) {
      return "아직 기록이 많지 않아요.";
    }
    const avgText = weeklyAvg
      ? `최근 7일 평균 스트레스: ${weeklyAvg}`
      : "최근 7일 평균 스트레스가 없어요.";
    const spendText =
      avgExpense14 > 0
        ? `최근 14일 평균 지출: ₩${avgExpense14.toLocaleString()}`
        : "최근 14일 지출 데이터가 없어요.";
    return `${avgText} ${spendText}`;
  }, [avgExpense14, dailySummaries.length, weeklyAvg]);

  useEffect(() => {
    if (!user || !latestSummary) {
      setAiInsight(null);
      return;
    }
    let active = true;
    const loadAi = async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        const snap = await getDoc(doc(db, "insights", user.uid, "daily", latestSummary.date));
        const storedAi = normalizeAiInsight(snap.data()?.ai);
        if (storedAi) {
          if (active) setAiInsight(storedAi);
          return;
        }
        const ai = await ensureDailyAiInsight(db, user.uid, latestSummary, {
          avgExpense14,
          spendSpike: spendSurge,
          topCategories: latestSummary.topCategories.map((entry) => entry.category),
        });
        if (active) setAiInsight(ai);
      } catch (err) {
        console.error("Dashboard AI insight failed:", err);
        if (active) setAiError("AI 추천을 불러오지 못했어요.");
      } finally {
        if (active) setAiLoading(false);
      }
    };
    loadAi();
    return () => {
      active = false;
    };
  }, [avgExpense14, latestSummary, spendSurge, user]);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>대시보드</h1>
          <div className="muted">이번 주 스트레스 흐름과 소비 리듬을 요약했어요</div>
        </div>
      </div>

      {loading && <div className="card">데이터를 불러오는 중...</div>}
      {error && <div className="card">{error}</div>}

      <section className="summary-grid">
        <div className="summary-card">
          <div className="muted">스트레스 평균</div>
          <div className="stat">{weekLogs.length === 0 ? "-" : weeklyAvg || "-"}</div>
          <div className="muted">최근 7일</div>
        </div>
        <div className="summary-card">
          <div className="muted">지출 급증 여부</div>
          <div className="stat">{spendSurgeLabel}</div>
          <div className="muted">
            {avgExpense14 > 0
              ? `최근 14일 평균 ₩${avgExpense14.toLocaleString()}`
              : "데이터가 더 필요해요."}
          </div>
        </div>
        <div className="summary-card">
          <div className="muted">
            AI가 추천하는 오늘의 스트레스 감소 및 지출절약 루틴
          </div>
          {!isAiConfigured && (
            <>
              <div className="stat">AI 연결이 필요해요</div>
              <div className="muted">OpenAI 키를 설정하면 추천이 생성돼요.</div>
            </>
          )}
          {isAiConfigured && aiLoading && (
            <>
              <div className="stat">AI 추천 생성 중…</div>
              <div className="muted">오늘의 패턴을 정리하고 있어요.</div>
            </>
          )}
          {isAiConfigured && !aiLoading && aiError && (
            <>
              <div className="stat">AI 추천을 불러오지 못했어요</div>
              <div className="muted">{aiError}</div>
            </>
          )}
          {isAiConfigured && !aiLoading && !aiError && summaryRecommendation && (
            <>
              <div className="stat">{summaryRecommendation.title}</div>
              <div className="muted">{summaryRecommendation.duration}</div>
              <div className="reason">{summaryReason}</div>
            </>
          )}
          {isAiConfigured &&
            !aiLoading &&
            !aiError &&
            !summaryRecommendation && (
              <>
                <div className="stat">오늘 한 줄만 적어볼래요?</div>
                <div className="muted">기록이 쌓이면 추천이 생겨요.</div>
              </>
            )}
        </div>
      </section>

      <div className="split-layout">
        <section className="split-panel">
          <h3 className="panel-title">최근 기록</h3>
          <p className="panel-subtitle">{insightText}</p>
          <div className="card-grid">
            {recent.length === 0 && (
              <div className="empty-state">오늘 한 줄만 적어볼래요?</div>
            )}
            {recent.map((log) => (
              <div key={log.id} className="select-card">
                <div className="pill">{log.date.slice(5)}</div>
                <h4 style={{ marginTop: 10 }}>{log.mood}</h4>
                <div className="muted">{log.context}</div>
                <div style={{ marginTop: 10 }}>
                  <span className="pill">{log.score}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="split-panel">
          <h3 className="panel-title">요약 스냅샷</h3>
          <p className="panel-subtitle">
            프로필: {profile.displayName || "-"} · 역할: {profile.jobType || "-"} ·
            마지막 동기화: {lastSyncedAt ?? "-"}
          </p>
          <div className="card-grid">
            <div className="select-card">
              <div className="muted">고스트레스 날</div>
              <div className="stat" style={{ marginTop: 6 }}>
                {highStressDays.length}일
              </div>
              <div className="muted">최근 14일 기준</div>
            </div>
            <div className="select-card">
              <div className="muted">Top 카테고리</div>
              <div className="stat" style={{ marginTop: 6 }}>
                {financeTopCategory}
              </div>
              <div className="muted">최근 14일 합산</div>
            </div>
            <div className="select-card">
              <div className="muted">회복 지수</div>
              <div className="stat" style={{ marginTop: 6 }}>
                {recoveryIndex ?? "-"}
              </div>
              <div className="muted">스트레스 평균 기준</div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
