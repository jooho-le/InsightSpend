import React from "react";
import { StyleSheet, Text, View } from "react-native";

const logs = [
  { date: "06.11", mood: "Focused", context: "Deep work", score: 70 },
  { date: "06.12", mood: "Tense", context: "Client review", score: 45 },
  { date: "06.13", mood: "Relieved", context: "Release done", score: 78 },
];

export default function LogsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 로그</Text>
      <View style={styles.card}>
        {logs.map((log) => (
          <View key={`${log.date}-${log.mood}`} style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{log.date}</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{log.mood}</Text>
              <Text style={styles.rowSub}>{log.context}</Text>
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
});
