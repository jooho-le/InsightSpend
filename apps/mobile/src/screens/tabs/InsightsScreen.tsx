import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useAuth } from "../../auth";
import { db } from "../../firebase";
import type { StressLog } from "../../models";
import { routineTemplate } from "../../promptTemplates";

export default function InsightsScreen() {
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
    <View style={styles.container}>
      <Text style={styles.title}>인사이트</Text>
      {loading && <Text style={styles.muted}>불러오는 중...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

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
        <Text style={styles.label}>{routineTemplate.header}</Text>
        <Text style={styles.body}>{routineText}</Text>
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
});
