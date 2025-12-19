import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { buildChatResponse } from "../chatTemplates";
import { db } from "../firebase";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export default function Chatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const content = input.trim();
    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      text: content,
    };
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const sessionRef = doc(db, "chatSessions", user.uid);
      const messagesRef = collection(sessionRef, "messages");

      await addDoc(messagesRef, {
        role: userMessage.role,
        text: userMessage.text,
        createdAt: serverTimestamp(),
      });

      const reply = buildChatResponse(content);
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

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Empathy Chat</h1>
          <div className="muted">공감 템플릿 + 상황 기반 조언으로 응답합니다.</div>
        </div>
        <button className="ghost-button" onClick={clearChat}>
          Clear
        </button>
      </div>

      <section className="card chat-panel">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="muted">대화를 시작해보세요. 오늘 어떤 일이 있었나요?</div>
          )}
          {error && <div className="muted">{error}</div>}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-bubble ${message.role === "user" ? "me" : "bot"}`}
            >
              {message.text}
            </div>
          ))}
          {loading && <div className="chat-bubble bot">응답을 준비 중...</div>}
        </div>
        <div className="chat-input">
          <input
            className="input"
            placeholder="상황을 입력하세요. 예: 마감 때문에 긴장돼요."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                sendMessage();
              }
            }}
          />
          <button className="primary-button" onClick={sendMessage} disabled={!canSend}>
            Send
          </button>
        </div>
      </section>
    </AppShell>
  );
}
