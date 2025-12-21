import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../auth";
import { db } from "../../firebase";
import { updateDailySummaryForDate } from "../../utils/dailySummary";

export default function AddLogScreen() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState("");
  const [context, setContext] = useState("");
  const [memo, setMemo] = useState("");
  const [score, setScore] = useState("60");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    setError(null);
    setSuccess(null);

    const scoreValue = Number(score);
    if (!date || !mood || !context || Number.isNaN(scoreValue)) {
      setError("필수 항목을 입력하세요.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "stressLogs"), {
        uid: user.uid,
        date,
        mood,
        context,
        memo,
        score: scoreValue,
        createdAt: serverTimestamp(),
      });
      await updateDailySummaryForDate(db, user.uid, date);
      setSuccess("기록이 저장되었습니다.");
      setMood("");
      setContext("");
      setMemo("");
    } catch (err) {
      setError("저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>빠른 기록</Text>
      <View style={styles.card}>
        <Text style={styles.label}>날짜</Text>
        <TextInput value={date} onChangeText={setDate} style={styles.input} />
        <Text style={styles.label}>감정</Text>
        <TextInput value={mood} onChangeText={setMood} placeholder="예: Calm, Tense" style={styles.input} />
        <Text style={styles.label}>상황</Text>
        <TextInput value={context} onChangeText={setContext} placeholder="어떤 일이 있었나요?" style={styles.input} />
        <Text style={styles.label}>메모</Text>
        <TextInput
          placeholder="짧게 메모"
          style={[styles.input, styles.multiline]}
          multiline
          value={memo}
          onChangeText={setMemo}
        />
        <View style={styles.scoreRow}>
          <Text style={styles.label}>점수</Text>
          <TextInput
            value={score}
            onChangeText={setScore}
            style={[styles.input, styles.scoreInput]}
            keyboardType="numeric"
          />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>{success}</Text>}
        <TouchableOpacity style={styles.saveButton} onPress={submit} disabled={loading}>
          <Text style={styles.saveText}>{loading ? "저장 중..." : "저장"}</Text>
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
  scoreInput: {
    width: 80,
    textAlign: "center",
  },
  error: {
    fontSize: 12,
    color: "#b3261e",
  },
  success: {
    fontSize: 12,
    color: "#1a7f37",
  },
  muted: {
    fontSize: 12,
    color: "#777",
  },
  saveButton: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  saveText: {
    color: "#fff",
    fontSize: 15,
  },
});
