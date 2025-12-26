import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { AiInsight, FinanceLog, StressLog } from "../models";
import { isAiConfigured } from "../ai";
import { ensurePeriodAiInsight, normalizeAiInsight } from "../utils/aiInsights";
import { buildStressSpendInsight } from "../utils/insightEngine";

export default function Dashboard() {
  const { user } = useAuth();
  const [stressLogs, setStressLogs] = useState<StressLog[]>([]);
  const [financeLogs, setFinanceLogs] = useState<FinanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const periodDays = 14;
  const periodKey = `last-${periodDays}d`;

  const insight = useMemo(() => {
    if (!user) return null;
    return buildStressSpendInsight({
      stressLogs,
      financeLogs,
      periodDays,
    });
  }, [financeLogs, periodDays, stressLogs, user]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - (periodDays - 1));
    const startDate = start.toISOString().slice(0, 10);

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
        const recentLogs = logs
          .filter((log) => log.date && log.date >= startDate)
          .sort((a, b) => a.date.localeCompare(b.date));
        setStressLogs(recentLogs);
        setLoading(false);
      },
      (err) => {
        console.error("Dashboard stress logs snapshot failed:", err);
        setError("스트레스 기록을 불러오지 못했어요.");
        setLoading(false);
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
          .filter((log) => log.date && log.date >= startDate)
          .sort((a, b) => a.date.localeCompare(b.date));
        setFinanceLogs(recentLogs);
      },
      (err) => {
        console.error("Dashboard finance logs snapshot failed:", err);
        setError("지출 데이터를 불러오지 못했어요.");
      }
    );

    return () => {
      logsUnsub();
      financeUnsub();
    };
  }, [periodDays, user]);

  useEffect(() => {
    if (!user || !insight) {
      setAiInsight(null);
      return;
    }
    let active = true;
    const loadAi = async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        const snap = await getDoc(doc(db, "insights", user.uid, "summary", periodKey));
        const storedAi = normalizeAiInsight(snap.data()?.ai);
        if (storedAi) {
          if (active) setAiInsight(storedAi);
          return;
        }
        const ai = await ensurePeriodAiInsight(db, user.uid, insight, periodKey);
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
  }, [insight, periodKey, user]);

  const highSummary = insight?.bucketSummaries.find((item) => item.bucket === "High");
  const lowSummary = insight?.bucketSummaries.find((item) => item.bucket === "Low");
  const midSummary = insight?.bucketSummaries.find((item) => item.bucket === "Mid");
const ratioLabel =
    insight && insight.ratioHighLow != null
      ? `${insight.ratioHighLow.toFixed(1)}배`
      : "-";
  const ratioPercent =
    insight && insight.ratioHighLow != null
      ? `${Math.round((insight.ratioHighLow - 1) * 100)}%`
      : "-";
  const moodSummaries = insight?.moodCategoryTop.slice(0, 3) ?? [];
  const topSpendCategories = insight?.topSpendCategories.slice(0, 3) ?? [];
  const hasInsightData =
    Boolean(insight) &&
    (insight.avgExpense > 0 ||
      insight.highStressDays > 0 ||
      insight.lowStressDays > 0 ||
      insight.moodCategoryTop.length > 0);

  const formatExpenseCard = (value?: number) =>
    value != null ? `₩${value.toLocaleString()}` : "-";

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>대시보드</h1>
          <div className="muted">감정이 소비에 미치는 패턴을 한눈에 정리했어요.</div>
        </div>
      </div>

      {loading && <div className="card">데이터를 불러오는 중...</div>}
      {error && <div className="card">{error}</div>}

      <section className="summary-grid">
        <div className="summary-card">
          <div className="muted">High 스트레스 날 평균 지출</div>
          <div className="stat">
            {formatExpenseCard(highSummary?.avgDailyExpense)}
          </div>
          <div className="muted">최근 {periodDays}일 기준</div>
        </div>
        <div className="summary-card">
          <div className="muted">Low 스트레스 날 평균 지출</div>
          <div className="stat">
            {formatExpenseCard(lowSummary?.avgDailyExpense)}
          </div>
          <div className="muted">최근 {periodDays}일 기준</div>
        </div>
        <div className="summary-card">
          <div className="muted">High vs Low 지출 차이</div>
          <div className="stat">{ratioLabel}</div>
          <div className="muted">차이 {ratioPercent}</div>
        </div>
      </section>

      <div className="split-layout">
        <section className="split-panel">
          <h3 className="panel-title">구간별 지출 비교</h3>
          <p className="panel-subtitle">
            Low / Mid / High 스트레스 구간의 하루 평균 지출을 비교해요.
          </p>
          <div className="card-grid">
            <div className="select-card">
              <div className="muted">Low (0-39)</div>
              <h4>{formatExpenseCard(lowSummary?.avgDailyExpense)}</h4>
              <div className="muted">기록 {lowSummary?.dayCount ?? 0}일</div>
            </div>
            <div className="select-card">
              <div className="muted">Mid (40-69)</div>
              <h4>{formatExpenseCard(midSummary?.avgDailyExpense)}</h4>
              <div className="muted">기록 {midSummary?.dayCount ?? 0}일</div>
            </div>
            <div className="select-card">
              <div className="muted">High (70-100)</div>
              <h4>{formatExpenseCard(highSummary?.avgDailyExpense)}</h4>
              <div className="muted">기록 {highSummary?.dayCount ?? 0}일</div>
            </div>
          </div>
        </section>
        <section className="split-panel">
          <h3 className="panel-title">감정별 소비 카테고리 Top3</h3>
          <p className="panel-subtitle">
            감정별로 지출이 몰리는 카테고리를 보여줘요.
          </p>
          <div className="card-grid">
            {moodSummaries.length === 0 && (
              <div className="empty-state">오늘 한 줄만 적어볼래요?</div>
            )}
            {moodSummaries.map((summary) => (
              <div key={summary.mood} className="select-card">
                <div className="pill">{summary.mood}</div>
                <h4>Top 카테고리</h4>
                <div className="muted">
                  {summary.topCategories.length === 0
                    ? "지출 기록이 없어요."
                    : summary.topCategories
                        .map((entry) => `${entry.category} ₩${entry.amount.toLocaleString()}`)
                        .join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="split-layout" style={{ marginTop: 24 }}>
        <div className="split-panel">
          <h3 className="panel-title">나의 소비 트리거 요약</h3>
          <p className="panel-subtitle">{insight?.patternSummary ?? "오늘 한 줄만 적어볼래요?"}</p>
          <div className="insight-list">
            <div className="insight-row">
              <span className="muted">트리거</span>
              <span>{insight?.triggerSummary ?? "데이터를 쌓고 있어요."}</span>
            </div>
            <div className="insight-row">
              <span className="muted">최근 Top 카테고리</span>
              <span>
                {topSpendCategories.length === 0
                  ? "기록 없음"
                  : topSpendCategories.map((item) => item.category).join(" · ")}
              </span>
            </div>
          </div>
        </div>
        <div className="split-panel">
          <h3 className="panel-title">이번 주 개선 플랜</h3>
          <p className="panel-subtitle">
            감정-소비 패턴을 기반으로 추천을 정리했어요.
          </p>
          {!hasInsightData && (
            <div className="empty-state">오늘 한 줄만 적어볼래요?</div>
          )}
          {hasInsightData && !isAiConfigured && (
            <div className="muted">AI 키를 설정하면 개인화 추천이 생성돼요.</div>
          )}
          {hasInsightData && isAiConfigured && aiLoading && (
            <div className="muted">AI 추천을 생성 중이에요.</div>
          )}
          {hasInsightData && isAiConfigured && aiError && (
            <div className="muted">{aiError}</div>
          )}
          {hasInsightData && isAiConfigured && !aiLoading && !aiError && aiInsight && (
            <div className="insight-list">
              <div className="insight-row">
                <span className="muted">요약</span>
                <span>{aiInsight.summary}</span>
              </div>
              <div className="insight-row">
                <span className="muted">패턴</span>
                <span>{aiInsight.pattern}</span>
              </div>
              {aiInsight.goal && (
                <div className="insight-row">
                  <span className="muted">행동 목표</span>
                  <span>{aiInsight.goal}</span>
                </div>
              )}
              {aiInsight.recommendations.map((rec) => (
                <div key={`${rec.title}-${rec.type}`} className="select-card compact">
                  <div className="pill">{rec.type}</div>
                  <h4>{rec.title}</h4>
                  <div className="muted">{rec.duration}</div>
                  <div className="reason">{rec.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
