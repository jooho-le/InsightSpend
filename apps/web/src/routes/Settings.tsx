import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    jobType: "",
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const skipAutoSave = useRef(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const ref = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const nextForm = snapshot.exists()
          ? (snapshot.data() as { displayName?: string; jobType?: string })
          : { displayName: user.displayName ?? "", jobType: "" };
        skipAutoSave.current = true;
        setForm({
          displayName: nextForm.displayName ?? user.displayName ?? "",
          jobType: nextForm.jobType ?? "",
        });
        setLoading(false);
        setHasLoaded(true);
      },
      () => {
        setError("설정을 불러오지 못했어요.");
        setLoading(false);
        setHasLoaded(true);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const save = async (nextForm: typeof form) => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: nextForm.displayName,
          jobType: nextForm.jobType,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      setError("설정 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!user || !hasLoaded) return;
    if (skipAutoSave.current) {
      skipAutoSave.current = false;
      return;
    }
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      save(form);
    }, 600);
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [form, user, hasLoaded]);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>프로필 설정</h1>
          <div className="muted">기본 정보를 저장하면 인사이트가 더 정확해져요.</div>
        </div>
      </div>

      {loading && <div className="card">불러오는 중...</div>}
      {error && <div className="card">{error}</div>}

      <section className="split-layout">
        <div className="split-panel">
          <h3 className="panel-title">프로필 요약</h3>
          <p className="panel-subtitle">간단한 정보만 있어도 추천 정확도가 높아져요.</p>
          <div className="card-grid">
            <div className="card">
              <h4 style={{ marginTop: 0 }}>이름</h4>
              <div className="stat">{form.displayName || "이름을 입력해주세요"}</div>
              <div className="muted">로그에 표시될 이름</div>
            </div>
            <div className="card">
              <h4 style={{ marginTop: 0 }}>직업/역할</h4>
              <div className="stat">{form.jobType || "입력 전"}</div>
              <div className="muted">상황 기반 추천에 활용</div>
            </div>
          </div>
          <div className="empty-state" style={{ marginTop: 16 }}>
            {savedAt ? `마지막 저장: ${savedAt}` : "입력한 내용은 자동으로 저장돼요."}
          </div>
        </div>

        <div className="split-panel">
          <h3 className="panel-title">정보 수정</h3>
          <p className="panel-subtitle">필요할 때 언제든 업데이트하세요.</p>
          <div className="form-grid">
            <label>
              이름
              <input
                className="input"
                value={form.displayName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, displayName: event.target.value }))
                }
              />
            </label>
            <label>
              직업/역할
              <input
                className="input"
                value={form.jobType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, jobType: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="button-row">
            <button className="primary-button" onClick={() => save(form)} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
            <div className="muted">입력 후 0.6초 뒤 자동 저장됩니다.</div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
