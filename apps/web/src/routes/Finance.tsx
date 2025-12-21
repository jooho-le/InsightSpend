import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { FinanceLog } from "../models";
import { updateDailySummaryForDate } from "../utils/dailySummary";

export default function Finance() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FinanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "",
    amount: "",
    memo: "",
  });
  const canDelete = (log: FinanceLog) => !!user && log.uid === user.uid;

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
        setError("지출 데이터를 불러오지 못했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addFinance = async () => {
    if (!user) return;
    setError(null);
    const amountValue = Number(form.amount);
    if (!form.date || !form.category || Number.isNaN(amountValue)) {
      setError("필수 값을 입력하세요.");
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
    } catch (err) {
      setError("지출 추가에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const removeFinance = async (log: FinanceLog) => {
    if (!confirm("이 지출을 삭제할까요?")) return;
    if (!canDelete(log)) {
      setError("삭제 불가: 현재 로그인 uid와 지출 uid가 다릅니다. 로그인 계정을 확인하거나 문서 uid를 수정하세요.");
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
      console.error("지출 삭제 실패:", err);
      setError("지출 삭제에 실패했습니다.");
    }
  };

  const monthTotal = useMemo(
    () => logs.reduce((acc, log) => acc + (log.amount || 0), 0),
    [logs]
  );

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    logs.forEach((log) => {
      const key = log.category.trim() || "기타";
      totals.set(key, (totals.get(key) ?? 0) + log.amount);
    });
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  }, [logs]);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Finance</h1>
          <div className="muted">이번 달 지출 흐름을 확인하세요.</div>
        </div>
      </div>

      {loading && <div className="card">불러오는 중...</div>}
      {error && <div className="card">{error}</div>}
      {user && (
        <div className="muted" style={{ marginTop: 8 }}>
          현재 로그인 uid: {user.uid}
        </div>
      )}

      <section className="card">
        <h3>지출 추가</h3>
        <div className="form-grid">
          <label>
            Date
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, date: event.target.value }))
              }
            />
          </label>
          <label>
            Category
            <input
              className="input"
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="예: 식비, 교통, 취미"
            />
          </label>
          <label>
            Amount
            <input
              className="input"
              type="number"
              value={form.amount}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, amount: event.target.value }))
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
              placeholder="짧게 메모"
            />
          </label>
        </div>
        <div className="button-row">
          <button className="primary-button" onClick={addFinance} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h3>월간 총지출</h3>
          <div className="stat">{monthTotal.toLocaleString()}원</div>
          <div className="muted">이번 달 누적 합계</div>
        </div>
        <div className="card">
          <h3>카테고리별 합계</h3>
          <div className="insight-list">
            {categoryTotals.length === 0 && (
              <div className="muted">지출 기록이 없습니다.</div>
            )}
            {categoryTotals.map(([category, total]) => (
              <div key={category} className="insight-row">
                <span>{category}</span>
                <span className="pill">{total.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h3>지출 리스트</h3>
        <div className="log-list">
          {logs.length === 0 && <div className="muted">이번 달 지출이 없습니다.</div>}
          {logs.map((log) => (
            <div key={log.id} className="log-item">
              <div className="pill">{log.date.slice(5)}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{log.category}</div>
                {!!log.memo && <div className="muted">{log.memo}</div>}
                <div className="muted">uid: {log.uid}</div>
              </div>
              <div className="pill">{log.amount.toLocaleString()}원</div>
              <div className="log-actions">
                <button
                  className="danger-button"
                  onClick={() => removeFinance(log)}
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
