import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../auth";
import { db } from "../../firebase";
import type { DailyInsightSummary } from "../../models";
import { buildDateRange, syncDailySummariesForRange } from "../../utils/dailySummary";

export default function InsightsScreen() {
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
        setError("인사이트 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const weekSummaries = useMemo(() => dailySummaries.slice(-7), [dailySummaries]);

  const weeklyAvg = useMemo(() => {
    const scores = weekSummaries
      .map((summary) => summary.stressScoreAvg)
      .filter((score) => score > 0);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    return Math.round(sum / scores.length);
  }, [weekSummaries]);

  const { maxScore, minScore } = useMemo(() => {
    const scores = weekSummaries
      .map((summary) => summary.stressScoreMax)
      .filter((score) => score > 0);
    if (scores.length === 0) {
      return { maxScore: 0, minScore: 0 };
    }
    return {
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
    };
  }, [weekSummaries]);

  const topMoods = useMemo(() => {
    const freq = new Map<string, number>();
    weekSummaries.forEach((summary) => {
      const key = summary.topMood?.trim() ?? "";
      if (!key) return;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    });
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [weekSummaries]);

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

  const insightText = useMemo(() => {
    if (dailySummaries.length === 0) {
      return "최근 14일 기록이 없어 정서-지출 인사이트를 만들기 어렵습니다.";
    }
    const stressText =
      weekSummaries.length > 0
        ? `이번 주 평균 스트레스는 ${weeklyAvg}점입니다.`
        : "이번 주 스트레스 기록이 아직 없습니다.";
    const spendText =
      avgExpense14 > 0
        ? `최근 14일 평균 지출은 ${avgExpense14.toLocaleString()}원입니다.`
        : "최근 14일 지출 기록이 없습니다.";
    const categoryText = `최근 지출 Top 카테고리는 ${financeTopCategory}입니다.`;
    return `${stressText} ${spendText} ${categoryText}`;
  }, [avgExpense14, dailySummaries.length, financeTopCategory, weekSummaries.length, weeklyAvg]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>인사이트</Text>
      {loading && <Text style={styles.muted}>불러오는 중...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.card}>
        <Text style={styles.label}>정서-지출 인사이트</Text>
        <Text style={styles.body}>{insightText}</Text>
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>score ≥ 70</Text>
          <Text style={styles.badge}>{spendSurge ? "지출 급증" : "지출 안정"}</Text>
          <Text style={styles.badge}>{financeTopCategory}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Weekly Avg</Text>
        <Text style={styles.stat}>{weeklyAvg || "-"}</Text>
        <Text style={styles.muted}>평균 스트레스 점수</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Max / Min</Text>
        <Text style={styles.stat}>
          {maxScore || "-"} / {minScore || "-"}
        </Text>
        <Text style={styles.muted}>이번 주 최고/최저 점수</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Top Moods</Text>
        {topMoods.length === 0 && <Text style={styles.muted}>기록된 감정이 없습니다.</Text>}
        {topMoods.map(([mood, count]) => (
          <View key={mood} style={styles.moodRow}>
            <Text style={styles.body}>{mood}</Text>
            <Text style={styles.moodCount}>{count}회</Text>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>지출 대신 회복 루틴</Text>
        <Text style={styles.body}>지금은 실제 데이터 기반 추천만 보여줍니다.</Text>
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
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: "#777",
  },
  stat: {
    fontSize: 28,
    fontWeight: "600",
  },
  body: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  muted: {
    fontSize: 12,
    color: "#777",
  },
  error: {
    fontSize: 12,
    color: "#b3261e",
  },
  moodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moodCount: {
    fontSize: 12,
    color: "#444",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  badge: {
    fontSize: 12,
    color: "#444",
    backgroundColor: "#f3efe6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
});
