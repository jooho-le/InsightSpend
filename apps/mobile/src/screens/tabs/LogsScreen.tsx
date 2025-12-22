import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { useAuth } from "../../auth";
import { db } from "../../firebase";
import type { StressLog } from "../../models";
import { updateDailySummaryForDate } from "../../utils/dailySummary";
import { computeStressScore } from "../../utils/stressScore";

export default function LogsScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<StressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StressLog | null>(null);
  const [form, setForm] = useState({ mood: "", context: "", memo: "" });
  const editScore = computeStressScore(form.mood);

  useEffect(() => {
    if (!user) return;

    const logsQuery = query(
      collection(db, "stressLogs"),
      where("uid", "==", user.uid)
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

  const startEdit = (log: StressLog) => {
    setEditing(log);
    setForm({
      mood: log.mood,
      context: log.context,
      memo: log.memo,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ mood: "", context: "", memo: "" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!form.mood || !form.context) {
      setError("필수 값을 입력하세요.");
      return;
    }
    try {
      await updateDoc(doc(db, "stressLogs", editing.id), {
        mood: form.mood,
        context: form.context,
        memo: form.memo,
        score: computeStressScore(form.mood),
      });
      await updateDailySummaryForDate(db, user.uid, editing.date);
      cancelEdit();
    } catch (err) {
      setError("수정에 실패했습니다.");
    }
  };

  const removeLog = (log: StressLog) => {
    Alert.alert("로그 삭제", "이 로그를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "stressLogs", log.id));
            await updateDailySummaryForDate(db, user.uid, log.date);
          } catch (err) {
            setError("삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 로그</Text>
      {editing && (
        <View style={styles.editCard}>
          <Text style={styles.editTitle}>로그 수정</Text>
          <TextInput
            style={styles.input}
            value={form.mood}
            onChangeText={(text) => setForm((prev) => ({ ...prev, mood: text }))}
            placeholder="감정"
          />
          <TextInput
            style={styles.input}
            value={form.context}
            onChangeText={(text) => setForm((prev) => ({ ...prev, context: text }))}
            placeholder="상황"
          />
          <TextInput
            style={styles.input}
            value={form.memo}
            onChangeText={(text) => setForm((prev) => ({ ...prev, memo: text }))}
            placeholder="메모"
          />
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>점수(자동)</Text>
            <Text style={styles.scoreValue}>{form.mood ? editScore : "-"}</Text>
          </View>
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={saveEdit}>
              <Text style={styles.primaryButtonText}>저장</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={cancelEdit}>
              <Text style={styles.secondaryButtonText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.smallButton} onPress={() => startEdit(log)}>
                <Text style={styles.smallButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => removeLog(log)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
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
  editCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ece6da",
    gap: 10,
  },
  editTitle: {
    fontSize: 16,
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
  rowActions: {
    gap: 6,
  },
  smallButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd5c7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallButtonText: {
    fontSize: 11,
    color: "#333",
  },
  deleteButton: {
    backgroundColor: "#fff0f0",
    borderWidth: 1,
    borderColor: "#f1b6b6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: {
    fontSize: 11,
    color: "#b3261e",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ded7c8",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#faf9f6",
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#777",
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#111",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: "#222",
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
