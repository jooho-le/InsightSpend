import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { FinanceLog, StressLog } from "../models";
import {
  buildDateRange,
  computeDailySummary,
  updateDailySummaryForDate,
} from "../utils/dailySummary";

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
  const dailySummaries = useMemo(() => {
    if (!user) return [];
    const dates = buildDateRange(14);
    return dates.map((date) =>
      computeDailySummary(user.uid, date, stress14Logs, financeLogs)
    );
  }, [financeLogs, stress14Logs, user]);

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
        setError("최근 7일 데이터를 불러오지 못했습니다.");
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
        setError("최근 14일 데이터를 불러오지 못했습니다.");
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
        setError("지출 데이터를 불러오지 못했습니다.");
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

  const financeTopCategory = useMemo(() => {
    const totals = new Map<string, number>();
    dailySummaries.forEach((summary) => {
      summary.topCategories.forEach((entry) => {
        const key = entry.category.trim() || "기타";
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
    const lastSummary = dailySummaries[dailySummaries.length - 1];
    if (!lastSummary) return false;
    return lastSummary.dailyExpense >= avgExpense14 * 1.5;
  }, [avgExpense14, dailySummaries]);

  const highStressDays = useMemo(() => {
    return dailySummaries
      .filter((summary) => summary.stressScoreMax >= 70)
      .sort((a, b) => b.stressScoreMax - a.stressScoreMax)
      .slice(0, 3);
  }, [dailySummaries]);

  const latestSummary = useMemo(() => {
    const reversed = [...dailySummaries].reverse();
    return (
      reversed.find((summary) => summary.stressCount > 0 || summary.dailyExpense > 0) ||
      dailySummaries[dailySummaries.length - 1] ||
      null
    );
  }, [dailySummaries]);

  const insightText = useMemo(() => {
    if (dailySummaries.length === 0) {
      return "최근 14일 기준으로 정서와 지출 데이터를 더 쌓아주세요.";
    }
    const stressText =
      highStressDays.length > 0
        ? `고스트레스 기록이 ${highStressDays.length}일 있어요.`
        : "고스트레스 기록은 아직 없습니다.";
    const spendText = spendSurge
      ? "최근 2주 지출이 이전 대비 크게 늘었어요."
      : "최근 2주 지출은 평소 범위에 있어요.";
    const categoryText = `최근 2주 가장 큰 지출 카테고리는 ${financeTopCategory}입니다.`;
    return `${stressText} ${spendText} ${categoryText}`;
  }, [dailySummaries.length, financeTopCategory, highStressDays.length, spendSurge]);

  const { routineReason, quickRoutines, deepRoutines } = useMemo(() => {
    const quick = [
      {
        title: "4-7-8 호흡 60초",
        reason: "숨을 4초 들이마시고 7초 멈춘 뒤 8초 내쉬며 긴장을 낮춰요.",
      },
      {
        title: "2분 바디 스캔",
        reason: "어깨·턱·손목의 힘을 풀며 감정을 빠르게 안정시켜요.",
      },
    ];

    const deep = [];
    const topCategory = latestSummary?.topCategories[0]?.category ?? "기타";
    const context = latestSummary?.topContext ?? "";

    if (spendSurge) {
      quick.push({
        title: "지출 충동 90초 멈춤",
        reason: "손목·어깨 스트레칭으로 충동을 끊고 다시 판단할 시간을 확보해요.",
      });
    }

    if (topCategory.includes("배달")) {
      deep.push({
        title: "10분 간단식 + 물 한 컵",
        reason: "배달 충동을 줄이고 몸을 먼저 안정시키는 루틴이에요.",
      });
    } else if (topCategory.includes("쇼핑")) {
      deep.push({
        title: "장바구니 24시간 보류",
        reason: "지출을 미루고 필요한 항목만 위시리스트로 남겨요.",
      });
    } else if (topCategory.includes("카페")) {
      deep.push({
        title: "15분 산책 + 따뜻한 물",
        reason: "카페 대신 몸의 긴장을 풀고 기분을 전환해요.",
      });
    }

    if (context.includes("대인")) {
      deep.push({
        title: "대화 스크립트 1문장 + 15분 걷기",
        reason: "감정을 정리하고 다음 대화를 준비하는 루틴이에요.",
      });
    } else if (context.includes("야근") || context.includes("업무")) {
      deep.push({
        title: "퇴근 전 10분 스트레칭",
        reason: "업무 긴장을 풀고 소비 충동을 낮춰요.",
      });
    }

    if (deep.length === 0) {
      deep.push({
        title: "20분 집중 세션",
        reason: "작은 목표에 집중하며 스트레스가 소비로 번지는 것을 막아요.",
      });
    }

    const scoreText = latestSummary?.stressScoreMax
      ? `스트레스 점수 ${latestSummary.stressScoreMax}`
      : "최근 스트레스 기록";
    const spendText =
      avgExpense14 && latestSummary
        ? `평균 대비 ${Math.round((latestSummary.dailyExpense / avgExpense14) * 100)}%`
        : "지출 변화";

    return {
      quickRoutines: quick.slice(0, 3),
      deepRoutines: deep.slice(0, 3),
      routineReason: `${scoreText}, ${spendText} 수준이라 소비 대신 회복 루틴을 추천해요.`,
    };
  }, [avgExpense14, latestSummary, spendSurge]);

  const insightSummary = useMemo(() => {
    if (dailySummaries.length === 0) {
      return "최근 14일 기록이 없어 기본 인사이트를 제안합니다.";
    }
    const avgText = weeklyAvg
      ? `지난 7일 평균 스트레스 점수는 ${weeklyAvg}점입니다.`
      : "지난 7일 스트레스 평균이 아직 없습니다.";
    const spendText =
      avgExpense14 > 0
        ? `최근 14일 평균 지출은 ${avgExpense14.toLocaleString()}원입니다.`
        : "최근 14일 지출 기록이 없습니다.";
    return `${avgText} ${spendText}`;
  }, [avgExpense14, dailySummaries.length, weeklyAvg]);

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
      await updateDailySummaryForDate(db, user.uid, addForm.date);
      setAddForm({
        date: new Date().toISOString().slice(0, 10),
        mood: "",
        context: "",
        memo: "",
        score: "",
      });
      setShowAdd(false);
    } catch (err) {
      setAddError("로그 추가에 실패했습니다.");
    } finally {
      setSaving(false);
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
            {insightSummary} {routineReason}
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
          <h3>지출 대신 회복 루틴</h3>
          <p className="muted">{routineReason}</p>
          <div className="insight-list" style={{ marginTop: 12 }}>
            {quickRoutines.map((item) => (
              <div key={item.title} className="insight-row">
                <span>{item.title}</span>
                <span className="pill">1~5분</span>
              </div>
            ))}
          </div>
          <div className="insight-list" style={{ marginTop: 12 }}>
            {deepRoutines.map((item) => (
              <div key={item.title} className="insight-row">
                <span>{item.title}</span>
                <span className="pill">10~30분</span>
              </div>
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

      <section className="grid two">
        <div className="card">
          <h3>정서-지출 인사이트 카드</h3>
          <p className="muted">{insightText}</p>
          <div className="insight-list" style={{ marginTop: 12 }}>
            <div className="insight-row">
              <span>고스트레스 기준</span>
              <span className="pill">score ≥ 70</span>
            </div>
            <div className="insight-row">
              <span>지출 급증</span>
              <span className="pill">
                {avgExpense14 === 0 ? "기록 없음" : spendSurge ? "감지됨" : "안정적"}
              </span>
            </div>
            <div className="insight-row">
              <span>Top 카테고리</span>
              <span className="pill">{financeTopCategory}</span>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              “지출로 푸는 대신” 추천 루틴
            </div>
            <div className="insight-list">
              {quickRoutines.concat(deepRoutines).slice(0, 5).map((item) => (
                <div key={item.title} className="insight-row">
                  <span>{item.title}</span>
                  <span className="muted">{item.reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <h3>고스트레스 TOP3일 지출 내역</h3>
          {highStressDays.length === 0 && (
            <div className="muted">최근 14일에 고스트레스 기록이 없습니다.</div>
          )}
          <div className="log-list">
            {highStressDays.map((summary) => (
              <div key={summary.date} className="log-item">
                <div className="pill">{summary.date.slice(5)}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {summary.topCategories[0]?.category ?? "지출 없음"}
                  </div>
                  <div className="muted">
                    {summary.dailyExpense
                      ? `${summary.dailyExpense.toLocaleString()}원`
                      : "해당 날짜 지출이 없습니다."}
                  </div>
                </div>
                <div className="pill">
                  {summary.dailyExpense ? summary.dailyExpense.toLocaleString() : 0}원
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
