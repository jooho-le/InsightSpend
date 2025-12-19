import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../../auth";
import { db } from "../../firebase";

export default function SettingsScreen() {
  const { user, signOutUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ displayName: "", jobType: "" });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const ref = doc(db, "users", user.uid);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          const data = snapshot.data() as { displayName?: string; jobType?: string };
          setForm({
            displayName: data.displayName ?? user.displayName ?? "",
            jobType: data.jobType ?? "",
          });
        } else {
          setForm({
            displayName: user.displayName ?? "",
            jobType: "",
          });
        }
      } catch (err) {
        setError("설정 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: form.displayName,
          jobType: form.jobType,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSuccess("저장되었습니다.");
    } catch (err) {
      setError("설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>설정</Text>
      {loading && <Text style={styles.muted}>불러오는 중...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.card}>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          style={styles.input}
          value={form.displayName}
          onChangeText={(text) => setForm((prev) => ({ ...prev, displayName: text }))}
        />
        <Text style={styles.label}>Job type</Text>
        <TextInput
          style={styles.input}
          value={form.jobType}
          onChangeText={(text) => setForm((prev) => ({ ...prev, jobType: text }))}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>{success}</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={save} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? "저장 중..." : "저장"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>계정</Text>
        <Text style={styles.body}>{user?.displayName || "Anonymous"}</Text>
        <Text style={styles.muted}>{user?.email}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => signOutUser()}>
          <Text style={styles.secondaryButtonText}>로그아웃</Text>
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
  body: {
    fontSize: 15,
    color: "#333",
  },
  muted: {
    fontSize: 12,
    color: "#777",
  },
  error: {
    fontSize: 12,
    color: "#b3261e",
  },
  success: {
    fontSize: 12,
    color: "#1a7f37",
  },
  primaryButton: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: {
    color: "#222",
    fontSize: 13,
  },
});
