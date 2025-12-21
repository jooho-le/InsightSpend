import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { StressLog } from "../models";
import { updateDailySummaryForDate } from "../utils/dailySummary";

export default function Logs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<StressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<StressLog | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    mood: "",
    context: "",
    memo: "",
    score: "",
  });
  const [createForm, setCreateForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    mood: "",
    context: "",
    memo: "",
    score: "",
  });
  const canDelete = (log: StressLog) => !!user && log.uid === user.uid;

  const loadLogs = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const logsQuery = query(
        collection(db, "stressLogs"),
        where("uid", "==", user.uid)
      );
      const snapshot = await getDocs(logsQuery);
      const nextLogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<StressLog, "id">),
      }));
      const sortedLogs = nextLogs.sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
      );
      setLogs(sortedLogs);
    } catch (err) {
      console.error("Logs load failed:", err);
      setError("로그 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadLogs();
  }, [user]);

  const startEdit = (log: StressLog) => {
    setEditing(log);
    setForm({
      mood: log.mood,
      context: log.context,
      memo: log.memo,
      score: String(log.score),
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ mood: "", context: "", memo: "", score: "" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const scoreValue = Number(form.score);
      if (!form.mood || !form.context || Number.isNaN(scoreValue)) {
        setError("필수 값을 입력하세요.");
        return;
      }

      await updateDoc(doc(db, "stressLogs", editing.id), {
        mood: form.mood,
        context: form.context,
        memo: form.memo,
        score: scoreValue,
      });
      if (user) {
        await updateDailySummaryForDate(db, user.uid, editing.date);
      }
      await loadLogs();
      cancelEdit();
    } catch (err) {
      setError("로그 수정에 실패했습니다.");
    }
  };

  const addLog = async () => {
    if (!user) return;
    setError(null);
    const scoreValue = Number(createForm.score);
    if (!createForm.date || !createForm.mood || !createForm.context || Number.isNaN(scoreValue)) {
      setError("필수 값을 입력하세요.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "stressLogs"), {
        uid: user.uid,
        date: createForm.date,
        mood: createForm.mood,
        context: createForm.context,
        memo: createForm.memo,
        score: scoreValue,
        createdAt: serverTimestamp(),
      });
      await updateDailySummaryForDate(db, user.uid, createForm.date);
      setCreateForm({
        date: new Date().toISOString().slice(0, 10),
        mood: "",
        context: "",
        memo: "",
        score: "",
      });
      await loadLogs();
    } catch (err) {
      setError("로그 추가에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const removeLog = async (log: StressLog) => {
    if (!confirm("이 로그를 삭제할까요?")) return;
    if (!canDelete(log)) {
      setError("삭제 불가: 현재 로그인 uid와 로그 uid가 다릅니다. 로그인 계정을 확인하거나 문서 uid를 수정하세요.");
      return;
    }
    try {
      setError(null);
      await deleteDoc(doc(db, "stressLogs", log.id));
      setLogs((prev) => prev.filter((item) => item.id !== log.id));
      if (user) {
        await updateDailySummaryForDate(db, user.uid, log.date);
      }
    } catch (err) {
      console.error("로그 삭제 실패:", err);
      setError("로그 삭제에 실패했습니다.");
    }
  };

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Stress Logs</h1>
          <div className="muted">최근 기록을 한 눈에 확인하세요.</div>
        </div>
        <button className="ghost-button" onClick={() => setShowCreate((prev) => !prev)}>
          {showCreate ? "닫기" : "+ New log"}
        </button>
      </div>

      {loading && <div className="card">불러오는 중...</div>}
      {error && <div className="card">{error}</div>}
      {user && (
        <div className="muted" style={{ marginTop: 8 }}>
          현재 로그인 uid: {user.uid}
        </div>
      )}

      {showCreate && (
        <section className="card">
          <h3>새 로그 추가</h3>
          <div className="form-grid">
            <label>
              Date
              <input
                className="input"
                type="date"
                value={createForm.date}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, date: event.target.value }))
                }
              />
            </label>
            <label>
              Mood
              <input
                className="input"
                value={createForm.mood}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, mood: event.target.value }))
                }
              />
            </label>
            <label>
              Context
              <input
                className="input"
                value={createForm.context}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, context: event.target.value }))
                }
              />
            </label>
            <label>
              Memo
              <input
                className="input"
                value={createForm.memo}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, memo: event.target.value }))
                }
              />
            </label>
            <label>
              Score
              <input
                className="input"
                type="number"
                value={createForm.score}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, score: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="button-row">
            <button className="primary-button" onClick={addLog} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </section>
      )}

      {editing && (
        <section className="card">
          <h3>로그 수정</h3>
          <div className="form-grid">
            <label>
              Mood
              <input
                className="input"
                value={form.mood}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, mood: event.target.value }))
                }
              />
            </label>
            <label>
              Context
              <input
                className="input"
                value={form.context}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, context: event.target.value }))
                }
              />
            </label>
            <label>
              Memo
              <input
                className="input"
                value={form.memo}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, memo: event.target.value }))
                }
              />
            </label>
            <label>
              Score
              <input
                className="input"
                type="number"
                value={form.score}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, score: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="button-row">
            <button className="primary-button" onClick={saveEdit}>
              저장
            </button>
            <button className="secondary-button" onClick={cancelEdit}>
              취소
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h3>Latest entries</h3>
        <div className="log-list">
          {logs.length === 0 && <div className="muted">아직 기록이 없습니다.</div>}
          {logs.map((log) => (
            <div key={log.id} className="log-item">
              <div className="pill">{log.date}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{log.mood}</div>
                <div className="muted">{log.context}</div>
                {!!log.memo && <div className="muted">{log.memo}</div>}
                <div className="muted">uid: {log.uid}</div>
              </div>
              <div className="pill">{log.score}</div>
              <div className="log-actions">
                <button className="secondary-button" onClick={() => startEdit(log)}>
                  Edit
                </button>
                <button
                  className="danger-button"
                  onClick={() => removeLog(log)}
                  disabled={!canDelete(log)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
