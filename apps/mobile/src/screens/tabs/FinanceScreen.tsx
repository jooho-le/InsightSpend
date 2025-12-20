import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useAuth } from "../../auth";
import { db } from "../../firebase";
import type { FinanceLog } from "../../models";

export default function FinanceScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FinanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "",
    amount: "",
    memo: "",
  });

  useEffect(() => {
    if (!user) return;
    const logsQuery = query(
      collection(db, "financeLogs"),
      where("uid", "==", user.uid),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const nextLogs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FinanceLog, "id">),
        }));
        setLogs(nextLogs);
        setLoading(false);
      },
      () => {
        setError("지출을 불러오지 못했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addFinance = async () => {
    if (!user) return;
    setError(null);
    const amountValue = Number(form.amount);
    if (!form.date || !form.category || Number.isNaN(amountValue)) {
      setError("필수 항목을 입력하세요.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "financeLogs"), {
        uid: user.uid,
        date: form.date,
        category: form.category,
        amount: amountValue,
        memo: form.memo,
        createdAt: serverTimestamp(),
      });
      setForm({
        date: new Date().toISOString().slice(0, 10),
        category: "",
        amount: "",
        memo: "",
      });
    } catch (err) {
      setError("지출 추가에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const removeFinance = (logId: string) => {
    Alert.alert("지출 삭제", "이 지출을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "financeLogs", logId));
          } catch (err) {
            setError("지출 삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>지출 기록</Text>
      <View style={styles.card}>
        <Text style={styles.label}>날짜</Text>
        <TextInput
          style={styles.input}
          value={form.date}
          onChangeText={(text) => setForm((prev) => ({ ...prev, date: text }))}
        />
        <Text style={styles.label}>카테고리</Text>
        <TextInput
          style={styles.input}
          value={form.category}
          onChangeText={(text) => setForm((prev) => ({ ...prev, category: text }))}
          placeholder="예: 식비, 교통, 취미"
        />
        <Text style={styles.label}>금액</Text>
        <TextInput
          style={styles.input}
          value={form.amount}
          onChangeText={(text) => setForm((prev) => ({ ...prev, amount: text }))}
          keyboardType="numeric"
          placeholder="예: 12000"
        />
        <Text style={styles.label}>메모</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.memo}
          onChangeText={(text) => setForm((prev) => ({ ...prev, memo: text }))}
          placeholder="짧게 메모"
          multiline
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={addFinance} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? "저장 중..." : "저장"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>지출 리스트</Text>
        {loading && <Text style={styles.muted}>불러오는 중...</Text>}
        {!loading && logs.length === 0 && (
          <Text style={styles.muted}>아직 지출 기록이 없습니다.</Text>
        )}
        {logs.map((log) => (
          <View key={log.id} style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{log.date.slice(5)}</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{log.category}</Text>
              {!!log.memo && <Text style={styles.rowSub}>{log.memo}</Text>}
            </View>
            <View style={styles.amount}>
              <Text style={styles.amountText}>{log.amount.toLocaleString()}원</Text>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => removeFinance(log.id)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
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
    minHeight: 70,
    textAlignVertical: "top",
  },
  error: {
    fontSize: 12,
    color: "#b3261e",
  },
  primaryButton: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  amount: {
    backgroundColor: "#111",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  amountText: {
    color: "#fff",
    fontSize: 12,
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
  muted: {
    fontSize: 12,
    color: "#777",
  },
});
