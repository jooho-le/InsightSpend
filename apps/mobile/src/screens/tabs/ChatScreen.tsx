import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "../../auth";
import { type AiMessage, fetchChatCompletion } from "../../ai";
import { db } from "../../firebase";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const systemPrompt =
    "너는 공감형 스트레스 코치야. 사용자의 감정을 먼저 공감하고, 2~3개의 실천 가능한 조언을 짧게 제안해.";
  const maxHistory = 12;

  useEffect(() => {
    if (!user) return;
    const sessionRef = doc(db, "chatSessions", user.uid);
    const init = async () => {
      await setDoc(
        sessionRef,
        { uid: user.uid, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
        { merge: true }
      );
    };
    init();

    const messagesRef = collection(sessionRef, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextMessages = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Message, "id">),
        }));
        setMessages(nextMessages);
      },
      () => {
        setError("대화를 불러오지 못했습니다.");
      }
    );

    return () => unsubscribe();
  }, [user]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const sendMessage = async () => {
    if (!canSend || !user) return;
    setLoading(true);
    setError(null);
    const content = input.trim();
    setInput("");

    try {
      const sessionRef = doc(db, "chatSessions", user.uid);
      const messagesRef = collection(sessionRef, "messages");

      await addDoc(messagesRef, {
        role: "user",
        text: content,
        createdAt: serverTimestamp(),
      });

      const history: AiMessage[] = messages
        .slice(-maxHistory)
        .map((message) => ({ role: message.role, content: message.text }));
      const aiMessages: AiMessage[] = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content },
      ];
      const reply = await fetchChatCompletion(aiMessages);
      await addDoc(messagesRef, {
        role: "assistant",
        text: reply,
        createdAt: serverTimestamp(),
      });

      await setDoc(sessionRef, { updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      setError("메시지 전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const sessionRef = doc(db, "chatSessions", user.uid);
      const messagesRef = collection(sessionRef, "messages");
      const snapshot = await getDocs(messagesRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      batch.delete(sessionRef);
      await batch.commit();
      setMessages([]);
    } catch (err) {
      setError("대화를 삭제하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>공감 챗봇</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {messages.length === 0 && (
          <Text style={styles.muted}>오늘 어떤 일이 있었나요?</Text>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.bubble,
              message.role === "user" ? styles.bubbleMe : styles.bubbleBot,
            ]}
          >
            <Text style={message.role === "user" ? styles.bubbleTextMe : styles.bubbleTextBot}>
              {message.text}
            </Text>
          </View>
        ))}
        {loading && <Text style={styles.muted}>응답을 준비 중...</Text>}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="상황을 입력하세요."
        />
        <TouchableOpacity style={styles.button} onPress={sendMessage} disabled={!canSend}>
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
  },
  clearText: {
    fontSize: 12,
    color: "#222",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ece6da",
    gap: 10,
    minHeight: 320,
  },
  bubble: {
    padding: 10,
    borderRadius: 12,
    maxWidth: "80%",
  },
  bubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: "#111",
  },
  bubbleBot: {
    alignSelf: "flex-start",
    backgroundColor: "#f3efe6",
  },
  bubbleTextMe: {
    color: "#fff",
    fontSize: 13,
  },
  bubbleTextBot: {
    color: "#222",
    fontSize: 13,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ded7c8",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#111",
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
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
