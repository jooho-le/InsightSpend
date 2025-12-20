import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";
import type { FinanceLog } from "../models";

export default function Finance() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FinanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const logsQuery = query(
      collection(db, "financeLogs"),
      where("uid", "==", user.uid),
      where("date", ">=", monthStart),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const nextLogs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FinanceLog, "id">),
        }));
        setLogs(nextLogs);
        setLoading(false);
      },
      () => {
        setError("지출 데이터를 불러오지 못했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

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
                <div className="muted">{log.memo}</div>
              </div>
              <div className="pill">{log.amount.toLocaleString()}원</div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
