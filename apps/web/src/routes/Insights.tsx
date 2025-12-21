import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { DailyInsightSummary } from "../models";
import { buildDateRange, syncDailySummariesForRange } from "../utils/dailySummary";

type RoutineItem = {
  title: string;
  description: string;
};

export default function Insights() {
  const { user } = useAuth();
  const [dailySummaries, setDailySummaries] = useState<DailyInsightSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const dates = buildDateRange(14);
        const summaries = await syncDailySummariesForRange(db, user.uid, dates);
        setDailySummaries(summaries);
      } catch (err) {
        console.error("Insights load failed:", err);
        setError("인사이트 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const last7Summaries = useMemo(
    () => dailySummaries.slice(-7),
    [dailySummaries]
  );

  const weeklyAvg = useMemo(() => {
    const scores = last7Summaries
      .map((summary) => summary.stressScoreAvg)
      .filter((score) => score > 0);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    return Math.round(sum / scores.length);
  }, [last7Summaries]);

  const { maxScore, minScore } = useMemo(() => {
    const scores = last7Summaries
      .map((summary) => summary.stressScoreMax)
      .filter((score) => score > 0);
    if (scores.length === 0) {
      return { maxScore: 0, minScore: 0 };
    }
    return {
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
    };
  }, [last7Summaries]);

  const topMoods = useMemo(() => {
    const freq = new Map<string, number>();
    last7Summaries.forEach((summary) => {
      if (!summary.topMood) return;
      const key = summary.topMood.trim();
      if (!key) return;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    });
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [last7Summaries]);

  const topSpendCategory = useMemo(() => {
    const totals = new Map<string, number>();
    dailySummaries.forEach((summary) => {
      summary.topCategories.forEach((entry) => {
        const key = entry.category.trim() || "기타";
        totals.set(key, (totals.get(key) ?? 0) + entry.amount);
      });
    });
    const top = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : "-";
  }, [dailySummaries]);

  const avgExpense14 = useMemo(() => {
    if (dailySummaries.length === 0) return 0;
    const total = dailySummaries.reduce((acc, summary) => acc + summary.dailyExpense, 0);
    return Math.round(total / dailySummaries.length);
  }, [dailySummaries]);

  const highStressDays = useMemo(
    () =>
      dailySummaries
        .filter((summary) => summary.stressScoreMax >= 70)
        .sort(
          (a, b) =>
            b.stressScoreMax - a.stressScoreMax || b.date.localeCompare(a.date)
        )
        .slice(0, 3),
    [dailySummaries]
  );

  const highStressSpendTotal = useMemo(
    () => highStressDays.reduce((acc, summary) => acc + summary.dailyExpense, 0),
    [highStressDays]
  );

  const latestSummary = useMemo(() => {
    const reversed = [...dailySummaries].reverse();
    return (
      reversed.find((summary) => summary.stressCount > 0 || summary.dailyExpense > 0) ||
      dailySummaries[dailySummaries.length - 1] ||
      null
    );
  }, [dailySummaries]);

  const spendSpike = useMemo(() => {
    if (!latestSummary) return false;
    if (!avgExpense14) return false;
    return latestSummary.dailyExpense >= avgExpense14 * 1.5;
  }, [avgExpense14, latestSummary]);

  const spendTrend = useMemo(() => {
    const prev7 = dailySummaries.slice(0, 7);
    const last7 = dailySummaries.slice(-7);
    const last7Total = last7.reduce((acc, summary) => acc + summary.dailyExpense, 0);
    const prev7Total = prev7.reduce((acc, summary) => acc + summary.dailyExpense, 0);

    let status = "안정";
    if (avgExpense14 === 0) {
      status = "기록 없음";
    } else if (spendSpike) {
      status = "감지됨";
    }

    const changePct =
      prev7Total > 0 ? Math.round(((last7Total - prev7Total) / prev7Total) * 100) : null;

    return { last7Total, prev7Total, changePct, status };
  }, [avgExpense14, dailySummaries, spendSpike]);

  const insightSummary = useMemo(() => {
    if (dailySummaries.length === 0) return "최근 14일 기록이 없습니다.";
    const messages: string[] = [];
    if (highStressDays.length > 0) {
      messages.push(`고스트레스 날 ${highStressDays.length}일`);
    }
    if (avgExpense14 > 0) {
      messages.push(`최근 14일 평균 지출 ${avgExpense14.toLocaleString()}원`);
    }
    if (spendSpike) {
      messages.push("최근 지출 급증 감지");
    }
    if (topSpendCategory !== "-") {
      messages.push(`지출 최다 카테고리 ${topSpendCategory}`);
    }
    return messages.join(" · ");
  }, [avgExpense14, dailySummaries.length, highStressDays.length, spendSpike, topSpendCategory]);

  const { quickRoutines, deepRoutines, routineReason } = useMemo(() => {
    const quick: RoutineItem[] = [
      {
        title: "4-7-8 호흡 60초",
        description: "숨을 4초 들이마시고 7초 멈춘 뒤 8초 내쉬며 긴장을 낮춰요.",
      },
      {
        title: "2분 바디 스캔",
        description: "어깨·턱·손목의 힘을 풀며 감정을 빠르게 안정시켜요.",
      },
    ];

    const deep: RoutineItem[] = [];
    const topCategory = latestSummary?.topCategories[0]?.category ?? "기타";
    const context = latestSummary?.topContext ?? "";

    if (spendSpike) {
      quick.push({
        title: "지출 충동 90초 멈춤",
        description: "손목·어깨 스트레칭으로 충동을 끊고 다시 판단할 시간을 확보해요.",
      });
    }

    if (topCategory.includes("배달")) {
      deep.push({
        title: "10분 간단식 + 물 한 컵",
        description: "배달 충동을 줄이고 몸을 먼저 안정시키는 루틴이에요.",
      });
    } else if (topCategory.includes("쇼핑")) {
      deep.push({
        title: "장바구니 24시간 보류",
        description: "지출을 미루고 필요한 항목만 위시리스트로 남겨요.",
      });
    } else if (topCategory.includes("카페")) {
      deep.push({
        title: "15분 산책 + 따뜻한 물",
        description: "카페 대신 몸의 긴장을 풀고 기분을 전환해요.",
      });
    }

    if (context.includes("대인")) {
      deep.push({
        title: "대화 스크립트 1문장 + 15분 걷기",
        description: "감정을 정리하고 다음 대화를 준비하는 루틴이에요.",
      });
    } else if (context.includes("야근") || context.includes("업무")) {
      deep.push({
        title: "퇴근 전 10분 스트레칭",
        description: "업무 긴장을 풀고 소비 충동을 낮춰요.",
      });
    }

    if (deep.length === 0) {
      deep.push({
        title: "20분 집중 세션",
        description: "작은 목표에 집중하며 스트레스가 소비로 번지는 것을 막아요.",
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
  }, [avgExpense14, latestSummary, spendSpike]);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Insights</h1>
          <div className="muted">스트레스와 지출 흐름을 함께 정리했습니다.</div>
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
          <h3>Weekly Spend</h3>
          <div className="stat">
            {spendTrend.last7Total ? spendTrend.last7Total.toLocaleString() : "-"}원
          </div>
          <div className="muted">
            {spendTrend.changePct === null
              ? "최근 7일 지출"
              : `지난주 대비 ${Math.abs(spendTrend.changePct)}% ${
                  spendTrend.changePct >= 0 ? "증가" : "감소"
                }`}
          </div>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h3>스트레스-지출 인사이트 카드</h3>
          <div className="insight-list">
            <div className="insight-row">
              <span>고스트레스 기준</span>
              <span className="pill">score ≥ 70</span>
            </div>
            <div className="insight-row">
              <span>지출 급증</span>
              <span className="pill">{spendTrend.status}</span>
            </div>
            <div className="insight-row">
              <span>Top 카테고리</span>
              <span className="pill">{topSpendCategory}</span>
            </div>
            <div className="insight-row">
              <span>고스트레스 지출 합계</span>
              <span className="pill">
                {highStressSpendTotal ? highStressSpendTotal.toLocaleString() : 0}원
              </span>
            </div>
          </div>
          <div className="muted" style={{ marginTop: 12 }}>
            {insightSummary}
          </div>
        </div>
        <div className="card">
          <h3>고스트레스 TOP3일 지출 내역</h3>
          <div className="insight-list">
            {highStressDays.length === 0 && (
              <div className="muted">최근 14일 고스트레스 기록이 없습니다.</div>
            )}
            {highStressDays.map((summary) => (
              <div key={summary.date} className="insight-row">
                <span>
                  {summary.date} · {summary.topCategories[0]?.category ?? "기타"}
                </span>
                <span className="pill">
                  {summary.dailyExpense ? summary.dailyExpense.toLocaleString() : 0}원
                </span>
              </div>
            ))}
          </div>
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
      </section>
    </AppShell>
  );
}
