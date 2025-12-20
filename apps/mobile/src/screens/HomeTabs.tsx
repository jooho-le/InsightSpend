import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AddLogScreen from "./tabs/AddLogScreen";
import ChatScreen from "./tabs/ChatScreen";
import DashboardScreen from "./tabs/DashboardScreen";
import FinanceScreen from "./tabs/FinanceScreen";
import InsightsScreen from "./tabs/InsightsScreen";
import LogsScreen from "./tabs/LogsScreen";
import SettingsScreen from "./tabs/SettingsScreen";

type TabKey = "dashboard" | "add" | "logs" | "chat" | "insights" | "settings" | "finance";

export default function HomeTabs() {
  const [tab, setTab] = useState<TabKey>("dashboard");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {tab === "dashboard" && <DashboardScreen />}
        {tab === "add" && <AddLogScreen />}
        {tab === "logs" && <LogsScreen />}
        {tab === "chat" && <ChatScreen />}
        {tab === "insights" && <InsightsScreen />}
        {tab === "settings" && <SettingsScreen />}
        {tab === "finance" && <FinanceScreen />}
      </View>
      <View style={styles.tabBar}>
        <TabButton label="요약" active={tab === "dashboard"} onPress={() => setTab("dashboard")} />
        <TabButton label="기록" active={tab === "add"} onPress={() => setTab("add")} />
        <TabButton label="내 로그" active={tab === "logs"} onPress={() => setTab("logs")} />
        <TabButton label="챗봇" active={tab === "chat"} onPress={() => setTab("chat")} />
        <TabButton label="인사이트" active={tab === "insights"} onPress={() => setTab("insights")} />
        <TabButton label="설정" active={tab === "settings"} onPress={() => setTab("settings")} />
        <TabButton label="지출" active={tab === "finance"} onPress={() => setTab("finance")} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f4ef",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#e7e2d8",
    flexWrap: "wrap",
  },
  tabButton: {
    flexGrow: 1,
    flexBasis: "30%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#111",
  },
  tabLabel: {
    color: "#333",
    fontSize: 14,
  },
  tabLabelActive: {
    color: "#fff",
  },
});
