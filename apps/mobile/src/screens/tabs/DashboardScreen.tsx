import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useAuth } from "../../auth";
import { db } from "../../firebase";
import type { StressLog } from "../../models";

export default function DashboardScreen() {
  const { user, signOutUser } = useAuth();
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
        setError("통계 데이터를 불러오지 못했습니다.");
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
