import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { FinanceLog, StressLog } from "../models";
import { routineTemplate } from "../promptTemplates";

export default function Insights() {
  const { user } = useAuth();
  const [weekLogs, setWeekLogs] = useState<StressLog[]>([]);
  const [stress14Logs, setStress14Logs] = useState<StressLog[]>([]);
  const [financeLogs, setFinanceLogs] = useState<FinanceLog[]>([]);
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
        const start14 = new Date();
        start14.setDate(today.getDate() - 13);
        const start14Date = start14.toISOString().slice(0, 10);
        const start28 = new Date();
        start28.setDate(today.getDate() - 27);
        const start28Date = start28.toISOString().slice(0, 10);

        const stressQuery = query(
          collection(db, "stressLogs"),
          where("uid", "==", user.uid)
        );
        const financeQuery = query(
          collection(db, "financeLogs"),
          where("uid", "==", user.uid)
        );

        const [stressSnapshot, financeSnapshot] = await Promise.all([
          getDocs(stressQuery),
          getDocs(financeQuery),
        ]);

        const stressLogs = stressSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<StressLog, "id">),
        }));

        const nextFinanceLogs = financeSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<FinanceLog, "id">),
        }));

        const weekLogs = stressLogs
          .filter((log) => log.date && log.date >= startDate)
          .sort((a, b) => a.date.localeCompare(b.date));

        const stress14 = stressLogs
          .filter((log) => log.date && log.date >= start14Date)
          .sort((a, b) => a.date.localeCompare(b.date));

        const finance28 = nextFinanceLogs
          .filter((log) => log.date && log.date >= start28Date)
          .sort((a, b) => a.date.localeCompare(b.date));

        setWeekLogs(weekLogs);
        setStress14Logs(stress14);
        setFinanceLogs(finance28);
      } catch (err) {
        console.error("Insights load failed:", err);
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

  const highStressDays = useMemo(() => {
    const byDate = new Map<string, StressLog>();
    stress14Logs.forEach((log) => {
      if (!log.date) return;
      const existing = byDate.get(log.date);
      if (!existing || log.score > existing.score) {
        byDate.set(log.date, log);
      }
    });
    return Array.from(byDate.values())
      .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [stress14Logs]);

  const highStressDates = useMemo(
    () => new Set(highStressDays.map((log) => log.date)),
    [highStressDays]
  );

  const highStressSpendLogs = useMemo(
    () =>
      financeLogs
        .filter((log) => log.date && highStressDates.has(log.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [financeLogs, highStressDates]
  );

  const highStressSpendTotal = useMemo(
    () => highStressSpendLogs.reduce((acc, log) => acc + log.amount, 0),
    [highStressSpendLogs]
  );

  const topSpendCategory = useMemo(() => {
    const totals = new Map<string, number>();
    financeLogs.forEach((log) => {
      const key = log.category.trim() || "기타";
      totals.set(key, (totals.get(key) ?? 0) + log.amount);
    });
    const top = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : "-";
  }, [financeLogs]);

  const spendTrend = useMemo(() => {
    const today = new Date();
    const start7 = new Date();
    start7.setDate(today.getDate() - 6);
    const start7Date = start7.toISOString().slice(0, 10);
    const prevStart = new Date();
    prevStart.setDate(today.getDate() - 13);
    const prevStartDate = prevStart.toISOString().slice(0, 10);

    const last7Total = financeLogs
      .filter((log) => log.date && log.date >= start7Date)
      .reduce((acc, log) => acc + log.amount, 0);
    const prev7Total = financeLogs
      .filter((log) => log.date && log.date >= prevStartDate && log.date < start7Date)
      .reduce((acc, log) => acc + log.amount, 0);

    let status = "안정";
    if (last7Total === 0 && prev7Total === 0) {
      status = "기록 없음";
    } else if (prev7Total === 0 && last7Total > 0) {
      status = "감지됨";
    } else {
      const change = ((last7Total - prev7Total) / prev7Total) * 100;
      status = change >= 20 ? "감지됨" : "안정";
    }

    const changePct =
      prev7Total > 0 ? Math.round(((last7Total - prev7Total) / prev7Total) * 100) : null;

    return { last7Total, prev7Total, changePct, status };
  }, [financeLogs]);

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
            최근 14일 스트레스 기록과 최근 28일 지출을 기반으로 계산했습니다.
          </div>
        </div>
        <div className="card">
          <h3>고스트레스 TOP3일 지출 내역</h3>
          <div className="insight-list">
            {highStressDays.length === 0 && (
              <div className="muted">최근 14일 고스트레스 기록이 없습니다.</div>
            )}
            {highStressDays.length > 0 && highStressSpendLogs.length === 0 && (
              <div className="muted">고스트레스 날짜의 지출 기록이 없습니다.</div>
            )}
            {highStressSpendLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="insight-row">
                <span>
                  {log.date} · {log.category}
                </span>
                <span className="pill">{log.amount.toLocaleString()}원</span>
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
          <h3>{routineTemplate.header}</h3>
          <p className="muted">{routineText}</p>
        </div>
      </section>
    </AppShell>
  );
}
