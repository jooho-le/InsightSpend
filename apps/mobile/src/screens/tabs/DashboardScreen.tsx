import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth";

export default function DashboardScreen() {
  const { user, signOutUser } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>오늘의 요약</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Recovery index</Text>
        <Text style={styles.stat}>74</Text>
        <Text style={styles.muted}>지난주 대비 +6%</Text>
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
