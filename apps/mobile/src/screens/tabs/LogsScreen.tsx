import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useAuth } from "../../auth";
import { db } from "../../firebase";
import type { StressLog } from "../../models";

export default function LogsScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<StressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const logsQuery = query(
      collection(db, "stressLogs"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const nextLogs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<StressLog, "id">),
        }));
        setLogs(nextLogs);
        setLoading(false);
      },
      () => {
        setError("로그를 불러오지 못했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 로그</Text>
      <View style={styles.card}>
        {loading && <Text style={styles.muted}>불러오는 중...</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        {!loading && logs.length === 0 && (
          <Text style={styles.muted}>아직 기록이 없습니다.</Text>
        )}
        {logs.map((log) => (
          <View key={log.id} style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{log.date.slice(5)}</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{log.mood}</Text>
              <Text style={styles.rowSub}>{log.context}</Text>
              {!!log.memo && <Text style={styles.rowSub}>{log.memo}</Text>}
            </View>
            <View style={styles.score}>
              <Text style={styles.scoreText}>{log.score}</Text>
            </View>
          </View>
        ))}
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
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badge: {
    backgroundColor: "#f3efe6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    color: "#333",
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowSub: {
    fontSize: 12,
    color: "#777",
  },
  score: {
    backgroundColor: "#111",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  scoreText: {
    color: "#fff",
    fontSize: 12,
  },
  muted: {
    fontSize: 12,
    color: "#777",
  },
  error: {
    fontSize: 12,
    color: "#b3261e",
  },
});
