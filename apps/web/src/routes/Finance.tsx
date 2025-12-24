import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { FinanceLog } from "../models";
import { updateDailySummaryForDate } from "../utils/dailySummary";

export default function Finance() {
  const { user } = useAuth();
  const categoryOptions = ["식비", "카페", "교통", "쇼핑", "취미", "건강", "교육", "기타"];
  const [logs, setLogs] = useState<FinanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<FinanceLog | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "",
    amount: "",
    memo: "",
  });
  const [editForm, setEditForm] = useState({
    category: "",
    amount: "",
    memo: "",
  });
  const canDelete = (log: FinanceLog) => !!user && log.uid === user.uid;
  const selectedCategory = editing ? editForm.category : form.category;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const logsQuery = query(
      collection(db, "financeLogs"),
      where("uid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        const nextLogs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FinanceLog, "id">),
        }));
        const monthLogs = nextLogs
          .filter((log) => log.date && log.date >= monthStart)
          .sort((a, b) => b.date.localeCompare(a.date));
        setLogs(monthLogs);
        setLoading(false);
      },
      (err) => {
        console.error("Finance logs snapshot failed:", err);
        setError("지출 기록을 불러오지 못했어요.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const startEdit = (log: FinanceLog) => {
    setEditing(log);
    setShowCategoryPicker(false);
    setEditForm({
      category: log.category,
      amount: String(log.amount),
      memo: log.memo,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setShowCategoryPicker(false);
    setEditForm({ category: "", amount: "", memo: "" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setError(null);
    const amountValue = Number(editForm.amount);
    if (!editForm.category || Number.isNaN(amountValue)) {
      setError("필수 항목을 입력해주세요.");
      return;
    }
    try {
      await updateDoc(doc(db, "financeLogs", editing.id), {
        category: editForm.category,
        amount: amountValue,
        memo: editForm.memo,
      });
      if (user) {
        await updateDailySummaryForDate(db, user.uid, editing.date);
      }
      cancelEdit();
    } catch (err) {
      setError("지출 기록 수정에 실패했어요.");
    }
  };

  const addFinance = async () => {
    if (!user) return;
    setError(null);
    const amountValue = Number(form.amount);
    if (!form.date || !form.category || Number.isNaN(amountValue)) {
      setError("필수 항목을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "financeLogs"), {
        uid: user.uid,
        date: form.date,
        category: form.category,
        amount: amountValue,
        memo: form.memo,
        createdAt: serverTimestamp(),
      });
      await updateDailySummaryForDate(db, user.uid, form.date);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        category: "",
        amount: "",
        memo: "",
      });
      setShowCategoryPicker(false);
    } catch (err) {
      setError("지출 기록 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const removeFinance = async (log: FinanceLog) => {
    if (!confirm("이 지출 기록을 삭제할까요?")) return;
    if (!canDelete(log)) {
      setError("삭제 권한이 없어요. 로그인 상태와 UID를 확인해주세요.");
      return;
    }
    try {
      setError(null);
      await deleteDoc(doc(db, "financeLogs", log.id));
      setLogs((prev) => prev.filter((item) => item.id !== log.id));
      if (user) {
        await updateDailySummaryForDate(db, user.uid, log.date);
      }
    } catch (err) {
      console.error("Failed to delete expense:", err);
      setError("지출 기록 삭제에 실패했어요.");
    }
  };

  const monthTotal = useMemo(
    () => logs.reduce((acc, log) => acc + (log.amount || 0), 0),
    [logs]
  );

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    logs.forEach((log) => {
      const key = log.category.trim() || "Other";
      totals.set(key, (totals.get(key) ?? 0) + log.amount);
    });
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  }, [logs]);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>지출 기록</h1>
          <div className="muted">이번 달 지출 흐름을 한눈에 확인해요.</div>
        </div>
      </div>

      {loading && <div className="card">불러오는 중...</div>}
      {error && <div className="card">{error}</div>}

      <section className="split-layout">
        <div className="split-panel">
          <h3 className="panel-title">이번 달 요약</h3>
          <p className="panel-subtitle">지출 패턴을 빠르게 확인해요.</p>
          <div className="card-grid" style={{ marginBottom: 16 }}>
            <div className="card">
              <h4 style={{ marginTop: 0 }}>이번 달 합계</h4>
              <div className="stat">₩{monthTotal.toLocaleString()}</div>
              <div className="muted">이번 달 누적 지출</div>
            </div>
            <div className="card">
              <h4 style={{ marginTop: 0 }}>카테고리 합계</h4>
              <div className="insight-list">
                {categoryTotals.length === 0 && (
                  <div className="empty-state">오늘 한 줄만 적어볼래요?</div>
                )}
                {categoryTotals.map(([category, total]) => (
                  <div key={category} className="insight-row">
                    <span>{category}</span>
                    <span className="pill">₩{total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <h4 className="panel-title" style={{ fontSize: 16 }}>
            지출 기록
          </h4>
          <div className="log-list">
            {logs.length === 0 && (
              <div className="empty-state">오늘의 지출을 먼저 적어볼까요?</div>
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
                    <span className="entry-title">{log.category}</span>
                    <span className="pill">₩{log.amount.toLocaleString()}</span>
                  </div>
                  <div className="entry-meta">
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
                    disabled={!canDelete(log)}
                  >
                    수정
                  </button>
                  <button
                    className="danger-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeFinance(log);
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
          <h3 className="panel-title">{editing ? "지출 수정" : "지출 추가"}</h3>
          <p className="panel-subtitle">
            {editing ? "필요한 항목을 업데이트해보세요." : "카테고리를 선택하고 금액을 입력하세요."}
          </p>
          <div className="form-grid">
            <label>
              날짜
              <input
                className="input"
                type="date"
                value={editing ? editing.date : form.date}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, date: event.target.value }))
                }
                disabled={!!editing}
              />
            </label>
            <label>
              카테고리 빠른 선택
              <div className="mood-selector">
                <button
                  type="button"
                  className={`mood-trigger${selectedCategory ? " filled" : ""}${
                    showCategoryPicker ? " open" : ""
                  }`}
                  onClick={() => setShowCategoryPicker((prev) => !prev)}
                >
                  <div className="mood-trigger-text">
                    {selectedCategory ? (
                      <>
                        <span className="muted">선택됨</span>
                        <span>{selectedCategory}</span>
                      </>
                    ) : (
                      <>
                        <span className="muted">카테고리 선택</span>
                        <span>열기</span>
                      </>
                    )}
                  </div>
                  <span className="mood-trigger-icon">⌄</span>
                </button>
                {showCategoryPicker && (
                  <div className="toggle-cards">
                    {categoryOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`toggle-card${selectedCategory === option ? " active" : ""}`}
                        aria-pressed={selectedCategory === option}
                        onClick={() => {
                          if (editing) {
                            setEditForm((prev) => ({ ...prev, category: option }));
                          } else {
                            setForm((prev) => ({ ...prev, category: option }));
                          }
                          setShowCategoryPicker(false);
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
            <label>
              카테고리 직접 입력
              <input
                className="input"
                value={editing ? editForm.category : form.category}
                onChange={(event) =>
                  editing
                    ? setEditForm((prev) => ({ ...prev, category: event.target.value }))
                    : setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder="예: 배달, 쇼핑, 카페"
              />
            </label>
            <label>
              금액
              <input
                className="input"
                type="number"
                value={editing ? editForm.amount : form.amount}
                onChange={(event) =>
                  editing
                    ? setEditForm((prev) => ({ ...prev, amount: event.target.value }))
                    : setForm((prev) => ({ ...prev, amount: event.target.value }))
                }
              />
            </label>
            <label>
              메모
              <input
                className="input"
                value={editing ? editForm.memo : form.memo}
                onChange={(event) =>
                  editing
                    ? setEditForm((prev) => ({ ...prev, memo: event.target.value }))
                    : setForm((prev) => ({ ...prev, memo: event.target.value }))
                }
                placeholder="짧게 남기기"
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
              <button className="primary-button" onClick={addFinance} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
