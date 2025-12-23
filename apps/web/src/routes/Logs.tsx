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
import { computeStressScore } from "../utils/stressScore";

export default function Logs() {
  const { user } = useAuth();
  const moodOptions = [
    "행복함",
    "기쁨",
    "차분함",
    "보통",
    "불안",
    "짜증",
    "슬픔",
    "피곤",
    "스트레스",
  ];
  const [logs, setLogs] = useState<StressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<StressLog | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [form, setForm] = useState({
    mood: "",
    context: "",
    memo: "",
  });
  const [createForm, setCreateForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    mood: "",
    context: "",
    memo: "",
  });
  const canDelete = (log: StressLog) => !!user && log.uid === user.uid;
  const editScore = computeStressScore(form.mood);
  const createScore = computeStressScore(createForm.mood);
  const selectedMood = editing ? form.mood : createForm.mood;

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
      setError("로그를 불러오지 못했어요.");
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
    setShowMoodPicker(false);
    setForm({
      mood: log.mood,
      context: log.context,
      memo: log.memo,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setShowMoodPicker(false);
    setForm({ mood: "", context: "", memo: "" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      if (!form.mood || !form.context) {
        setError("필수 항목을 입력해주세요.");
        return;
      }

      await updateDoc(doc(db, "stressLogs", editing.id), {
        mood: form.mood,
        context: form.context,
        memo: form.memo,
        score: computeStressScore(form.mood),
      });
      if (user) {
        await updateDailySummaryForDate(db, user.uid, editing.date);
      }
      await loadLogs();
      cancelEdit();
    } catch (err) {
      setError("로그 수정에 실패했어요.");
    }
  };

  const addLog = async () => {
    if (!user) return;
    setError(null);
    if (!createForm.date || !createForm.mood || !createForm.context) {
      setError("필수 항목을 입력해주세요.");
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
        score: computeStressScore(createForm.mood),
        createdAt: serverTimestamp(),
      });
      await updateDailySummaryForDate(db, user.uid, createForm.date);
      setCreateForm({
        date: new Date().toISOString().slice(0, 10),
        mood: "",
        context: "",
        memo: "",
      });
      setShowMoodPicker(false);
      await loadLogs();
    } catch (err) {
      setError("로그 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const removeLog = async (log: StressLog) => {
    if (!confirm("이 기록을 삭제할까요?")) return;
    if (!canDelete(log)) {
      setError("삭제 권한이 없어요. 로그인 상태와 UID를 확인해주세요.");
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
      console.error("Failed to delete log:", err);
      setError("로그 삭제에 실패했어요.");
    }
  };

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>스트레스 기록</h1>
          <div className="muted">오늘의 감정을 한 줄로 남겨보세요.</div>
        </div>
      </div>

      {loading && <div className="card">불러오는 중...</div>}
      {error && <div className="card">{error}</div>}

      <section className="split-layout">
        <div className="split-panel">
          <h3 className="panel-title">최근 기록</h3>
          <p className="panel-subtitle">카드를 눌러 바로 수정할 수 있어요.</p>
          <div className="log-list">
            {logs.length === 0 && (
              <div className="empty-state">오늘 한 줄만 적어볼래요?</div>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                className="entry-card"
                role="button"
                tabIndex={0}
                onClick={() => startEdit(log)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    startEdit(log);
                  }
                }}
              >
                <div>
                  <div className="entry-header">
                    <span className="pill">{log.date}</span>
                    <span className="entry-title">{log.mood}</span>
                    <span className="pill">점수 {log.score}</span>
                  </div>
                  <div className="entry-meta">
                    <span>{log.context}</span>
                    {!!log.memo && <span>{log.memo}</span>}
                  </div>
                </div>
                <div className="entry-actions">
                  <button
                    className="secondary-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startEdit(log);
                    }}
                  >
                    수정
                  </button>
                  <button
                    className="danger-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeLog(log);
                    }}
                    disabled={!canDelete(log)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="split-panel">
          <h3 className="panel-title">{editing ? "기록 수정" : "오늘의 기록 추가"}</h3>
          <p className="panel-subtitle">
            {editing ? "감정과 상황을 업데이트해보세요." : "지금의 감정을 빠르게 기록하세요."}
          </p>
          <div className="form-grid">
            <label>
              날짜
              <input
                className="input"
                type="date"
                value={editing ? editing.date : createForm.date}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, date: event.target.value }))
                }
                disabled={!!editing}
              />
            </label>
            <label>
              기분
              <div className="mood-selector">
                <button
                  type="button"
                  className={`mood-trigger${selectedMood ? " filled" : ""}${
                    showMoodPicker ? " open" : ""
                  }`}
                  onClick={() => setShowMoodPicker((prev) => !prev)}
                >
                  <span className="mood-trigger-text">
                    {selectedMood || "기분 선택"}
                  </span>
                  <span className="mood-trigger-icon">▾</span>
                </button>
              </div>
              {showMoodPicker && (
                <div className="toggle-cards">
                  {moodOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`toggle-card${selectedMood === option ? " active" : ""}`}
                      aria-pressed={selectedMood === option}
                      onClick={() => {
                        if (editing) {
                          setForm((prev) => ({ ...prev, mood: option }));
                        } else {
                          setCreateForm((prev) => ({ ...prev, mood: option }));
                        }
                        setShowMoodPicker(false);
                      }}
                    >
                      <span className="toggle-card-label">{option}</span>
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label>
              상황
              <input
                className="input"
                value={editing ? form.context : createForm.context}
                onChange={(event) =>
                  editing
                    ? setForm((prev) => ({ ...prev, context: event.target.value }))
                    : setCreateForm((prev) => ({ ...prev, context: event.target.value }))
                }
                placeholder="예: 팀 회의, 과제 마감"
              />
            </label>
            <label>
              메모
              <input
                className="input"
                value={editing ? form.memo : createForm.memo}
                onChange={(event) =>
                  editing
                    ? setForm((prev) => ({ ...prev, memo: event.target.value }))
                    : setCreateForm((prev) => ({ ...prev, memo: event.target.value }))
                }
                placeholder="짧게 남기기"
              />
            </label>
            <label>
              스트레스 점수 (자동)
              <input
                className="input"
                type="number"
                value={
                  editing
                    ? form.mood
                      ? String(editScore)
                      : ""
                    : createForm.mood
                      ? String(createScore)
                      : ""
                }
                readOnly
              />
            </label>
          </div>
          <div className="button-row">
            {editing ? (
              <>
                <button className="primary-button" onClick={saveEdit}>
                  수정 저장
                </button>
                <button className="secondary-button" onClick={cancelEdit}>
                  취소
                </button>
              </>
            ) : (
              <button className="primary-button" onClick={addLog} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
