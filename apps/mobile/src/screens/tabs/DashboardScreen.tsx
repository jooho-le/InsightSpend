import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { isAiConfigured } from "../../ai";
import { useAuth } from "../../auth";
import { db } from "../../firebase";
import type { AiInsight, FinanceLog, StressLog } from "../../models";
import { buildDateRange, computeDailySummary } from "../../utils/dailySummary";
import { ensureDailyAiInsight, normalizeAiInsight } from "../../utils/aiInsights";

export default function DashboardScreen() {
  const { user, signOutUser } = useAuth();
  const [weekLogs, setWeekLogs] = useState<StressLog[]>([]);
  const [stress14Logs, setStress14Logs] = useState<StressLog[]>([]);
  const [financeLogs, setFinanceLogs] = useState<FinanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<StressLog, "id">),
        }));
        const weekLogs = logs
          .filter((log) => log.date && log.date >= startDate)
          .sort((a, b) => a.date.localeCompare(b.date));
        setWeekLogs(weekLogs);
        setLoading(false);
      },
      (err) => {
        console.error("Dashboard week logs snapshot failed:", err);
        setError("통계 데이터를 불러오지 못했습니다.");
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
        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<StressLog, "id">),
        }));
        const recentLogs = logs
          .filter((log) => log.date && log.date >= start14Date)
          .sort((a, b) => a.date.localeCompare(b.date));
        setStress14Logs(recentLogs);
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
        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<FinanceLog, "id">),
        }));
        const recentLogs = logs
          .filter((log) => log.date && log.date >= start28Date)
          .sort((a, b) => a.date.localeCompare(b.date));
        setFinanceLogs(recentLogs);
      },
      (err) => {
        console.error("Dashboard finance logs snapshot failed:", err);
        setError("지출 데이터를 불러오지 못했습니다.");
      }
    );

    return () => {
      logsUnsub();
      stress14Unsub();
      financeUnsub();
    };
  }, [user]);

  const weeklyAvg = useMemo(() => {
    const scores = weekLogs.map((log) => log.score).filter((score) => score > 0);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    return Math.round(sum / scores.length);
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

  const financeTopCategory = useMemo(() => {
    const totals = new Map<string, number>();
    const today = new Date();
    const start14 = new Date();
    start14.setDate(today.getDate() - 13);
    const start14Date = start14.toISOString().slice(0, 10);
    financeLogs
      .filter((log) => log.date >= start14Date)
      .forEach((log) => {
        const key = log.category.trim() || "기타";
        totals.set(key, (totals.get(key) ?? 0) + log.amount);
      });
    const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? "기타";
  }, [financeLogs]);

  const dateRange14 = useMemo(() => buildDateRange(14), []);

  const dailySummaries = useMemo(() => {
    if (!user) return [];
    return dateRange14.map((date) =>
      computeDailySummary(user.uid, date, stress14Logs, financeLogs)
    );
  }, [dateRange14, financeLogs, stress14Logs, user]);

  const latestSummary = useMemo(() => {
    const reversed = [...dailySummaries].reverse();
    return (
      reversed.find((summary) => summary.stressCount > 0 || summary.dailyExpense > 0) ||
      dailySummaries[dailySummaries.length - 1] ||
      null
    );
  }, [dailySummaries]);

  const avgExpense14 = useMemo(() => {
    if (dailySummaries.length === 0) return 0;
    const total = dailySummaries.reduce((acc, summary) => acc + summary.dailyExpense, 0);
    return Math.round(total / dailySummaries.length);
  }, [dailySummaries]);

  const spendSurge = useMemo(() => {
    if (!latestSummary || avgExpense14 === 0) return false;
    return latestSummary.dailyExpense >= avgExpense14 * 1.5;
  }, [avgExpense14, latestSummary]);

  const highStressDays = useMemo(() => {
    return stress14Logs
      .filter((log) => log.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [stress14Logs]);

  const insightText = useMemo(() => {
    if (stress14Logs.length === 0 && financeLogs.length === 0) {
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
  }, [financeLogs.length, financeTopCategory, highStressDays.length, spendSurge, stress14Logs.length]);

  const highStressSpendLogs = useMemo(() => {
    const byDate = new Map<string, FinanceLog[]>();
    highStressDays.forEach((day) => {
      byDate.set(day.date, []);
    });
    financeLogs.forEach((log) => {
      const list = byDate.get(log.date);
      if (list) {
        list.push(log);
      }
    });
    return Array.from(byDate.entries());
  }, [financeLogs, highStressDays]);

  useEffect(() => {
    if (!user || !latestSummary) {
      setAiInsight(null);
      return;
    }
    let active = true;
    const loadAi = async () => {
      if (!isAiConfigured) {
        if (active) setAiInsight(null);
        return;
      }
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
        if (active) setAiError("AI 추천을 불러오지 못했습니다.");
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
    <View style={styles.container}>
      <Text style={styles.title}>오늘의 요약</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Recovery index</Text>
        <Text style={styles.stat}>{weeklyAvg ? Math.max(0, 100 - weeklyAvg) : "-"}</Text>
        <Text style={styles.muted}>최근 7일 기준</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>주간 평균</Text>
        <Text style={styles.stat}>{weeklyAvg || "-"}</Text>
        <Text style={styles.muted}>최근 7일 평균 점수</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>감정 Top3</Text>
        {loading && <Text style={styles.muted}>불러오는 중...</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        {!loading && topMoods.length === 0 && (
          <Text style={styles.muted}>기록된 감정이 없습니다.</Text>
        )}
        {!loading &&
          topMoods.map(([mood, count]) => (
            <View key={mood} style={styles.moodRow}>
              <Text style={styles.body}>{mood}</Text>
              <Text style={styles.moodCount}>{count}회</Text>
            </View>
          ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>정서-지출 인사이트</Text>
        <Text style={styles.body}>{aiInsight?.summary ?? insightText}</Text>
        <View style={styles.moodRow}>
          <Text style={styles.muted}>지출 급증</Text>
          <Text style={styles.moodCount}>{spendSurge ? "감지됨" : "안정적"}</Text>
        </View>
        <View style={styles.moodRow}>
          <Text style={styles.muted}>Top 카테고리</Text>
          <Text style={styles.moodCount}>{financeTopCategory}</Text>
        </View>
        <View style={{ marginTop: 10 }}>
          <Text style={styles.label}>“지출로 푸는 대신”</Text>
          {!isAiConfigured && (
            <Text style={styles.muted}>AI 키가 설정되지 않아 추천을 만들 수 없습니다.</Text>
          )}
          {aiLoading && <Text style={styles.muted}>AI 추천을 생성 중입니다...</Text>}
          {aiError && <Text style={styles.muted}>{aiError}</Text>}
          {aiInsight ? (
            <>
              <Text style={styles.muted}>{aiInsight.pattern}</Text>
              {aiInsight.recommendations.map((rec) => (
                <View key={`${rec.title}-${rec.duration}`} style={styles.moodRow}>
                  <Text style={styles.body}>{`${rec.title} · ${rec.duration}`}</Text>
                  <Text style={styles.moodCount}>{rec.type}</Text>
                </View>
              ))}
            </>
          ) : (
            !aiLoading &&
            isAiConfigured && (
              <Text style={styles.muted}>추천을 만들 충분한 기록이 없습니다.</Text>
            )
          )}
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>고스트레스 TOP3일 지출</Text>
        {highStressDays.length === 0 && (
          <Text style={styles.muted}>최근 14일 고스트레스 기록이 없습니다.</Text>
        )}
        {highStressSpendLogs.map(([date, logs]) => (
          <View key={date} style={styles.moodRow}>
            <Text style={styles.body}>{date.slice(5)}</Text>
            <Text style={styles.muted}>
              {logs.length === 0
                ? "지출 없음"
                : logs.map((log) => `${log.category} ${log.amount.toLocaleString()}원`).join(" · ")}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>사용자</Text>
        <Text style={styles.body}>{user?.displayName || "Anonymous"}</Text>
        <Text style={styles.muted}>{user?.email}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={() => signOutUser()}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ece6da",
  },
  label: {
    fontSize: 13,
    color: "#777",
  },
  stat: {
    fontSize: 28,
    fontWeight: "600",
    marginTop: 8,
  },
  body: {
    fontSize: 15,
    marginTop: 8,
  },
  muted: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
  error: {
    fontSize: 12,
    color: "#b3261e",
    marginTop: 4,
  },
  moodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  moodCount: {
    fontSize: 12,
    color: "#444",
  },
  logoutButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  logoutText: {
    fontSize: 13,
    color: "#222",
  },
});
