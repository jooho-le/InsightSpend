import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

export default function AddLogScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>빠른 기록</Text>
      <View style={styles.card}>
        <Text style={styles.label}>감정</Text>
        <TextInput placeholder="예: Calm, Tense" style={styles.input} />
        <Text style={styles.label}>상황</Text>
        <TextInput placeholder="어떤 일이 있었나요?" style={styles.input} />
        <Text style={styles.label}>메모</Text>
        <TextInput
          placeholder="짧게 메모"
          style={[styles.input, styles.multiline]}
          multiline
        />
        <View style={styles.scoreRow}>
          <Text style={styles.label}>점수</Text>
          <View style={styles.scorePill}>
            <Text style={styles.scoreText}>65</Text>
          </View>
        </View>
        <Text style={styles.muted}>저장은 다음 단계에서 연결됩니다.</Text>
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
    gap: 10,
  },
  label: {
    fontSize: 13,
    color: "#777",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ded7c8",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#faf9f6",
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scorePill: {
    backgroundColor: "#111",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  scoreText: {
    color: "#fff",
    fontSize: 14,
  },
  muted: {
    fontSize: 12,
    color: "#777",
  },
});
