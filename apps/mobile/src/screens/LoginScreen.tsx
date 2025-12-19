import React from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../auth";

export default function LoginScreen() {
  const { promptGoogleSignIn } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>InsightSpend</Text>
        <Text style={styles.body}>
          스트레스 리듬을 기록하고 나만의 회복 전략을 만들어보세요.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => promptGoogleSignIn()}>
          <Text style={styles.buttonText}>Google로 로그인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f4ef",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 20,
    width: "100%",
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    color: "#555",
  },
  button: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
  },
});
