import React from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AuthProvider, useAuth } from "./src/auth";

function LoginScreen() {
  const { promptGoogleSignIn } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>InsightSpend</Text>
      <Text style={styles.body}>Google 계정으로 로그인해서 시작하세요.</Text>
      <TouchableOpacity style={styles.button} onPress={() => promptGoogleSignIn()}>
        <Text style={styles.buttonText}>Google로 로그인</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function HomeScreen() {
  const { user, signOutUser } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>로그인 완료</Text>
      <View style={styles.card}>
        <Text style={styles.label}>이름: {user?.displayName || "-"}</Text>
        <Text style={styles.label}>이메일: {user?.email || "-"}</Text>
        <Text style={styles.label}>UID: {user?.uid}</Text>
      </View>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => signOutUser()}>
        <Text style={styles.secondaryButtonText}>로그아웃</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return user ? <HomeScreen /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f6f7fb",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: "#444",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#111",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    width: "100%",
    marginTop: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: "#222",
  },
  secondaryButton: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  secondaryButtonText: {
    color: "#333",
    fontSize: 16,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f6f7fb",
  },
});
