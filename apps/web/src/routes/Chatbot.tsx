import { useEffect, useMemo, useState } from "react";
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
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { type AiMessage, fetchChatCompletion } from "../ai";
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
  const systemPrompt =
    "당신은 공감형 스트레스 코치입니다. 먼저 감정을 공감하고, 2~3개의 짧고 실행 가능한 팁을 제안하세요.";
  const maxHistory = 12;
  const promptOptions = [
    "오늘 지출이 늘었는데 이유가 궁금해요.",
    "스트레스가 높을 때 바로 할 수 있는 방법 알려줘.",
    "배달 충동을 줄이려면 어떻게 해야 할까요?",
    "잠깐 진정될 수 있는 5분 루틴 추천해줘.",
  ];

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
        setError("대화를 불러오지 못했어요.");
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
      setError("메시지 전송에 실패했어요.");
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
      setError("대화를 초기화하지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>공감 코치</h1>
          <div className="muted">오늘의 상황을 정리하고 빠른 회복 아이디어를 받아보세요.</div>
        </div>
      </div>

      <section className="split-layout">
        <div className="split-panel">
          <h3 className="panel-title">대화 기록</h3>
          <p className="panel-subtitle">짧게라도 적으면 분석이 더 정확해져요.</p>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="empty-state">오늘의 감정을 한 줄로 적어볼까요?</div>
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
            {loading && <div className="chat-bubble bot">답변을 준비 중이에요...</div>}
          </div>
        </div>

        <div className="split-panel">
          <h3 className="panel-title">감정 정리 입력</h3>
          <p className="panel-subtitle">지출과 스트레스가 이어지는 순간을 알려주세요.</p>
          <div className="card-grid" style={{ marginBottom: 16 }}>
            {promptOptions.map((option) => (
              <button
                key={option}
                type="button"
                className="select-card"
                onClick={() => setInput(option)}
              >
                <h4>{option}</h4>
                <div className="muted">눌러서 입력</div>
              </button>
            ))}
          </div>
          <div className="chat-input" style={{ marginBottom: 12 }}>
            <input
              className="input"
              placeholder="예: 오늘 배달이 늘었는데 이유가 궁금해요."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendMessage();
                }
              }}
            />
            <button className="primary-button" onClick={sendMessage} disabled={!canSend}>
              보내기
            </button>
          </div>
          <div className="button-row" style={{ justifyContent: "space-between" }}>
            <div className="muted">
              {loading ? "응답을 불러오는 중이에요." : "필요하면 언제든 초기화할 수 있어요."}
            </div>
            <button className="secondary-button" onClick={clearChat}>
              대화 초기화
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
