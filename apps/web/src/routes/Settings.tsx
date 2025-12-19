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
        setError("설정 정보를 불러오지 못했습니다.");
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
      setError("설정 저장에 실패했습니다.");
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
          <h1>Settings</h1>
          <div className="muted">프로필과 직군 정보를 관리합니다.</div>
        </div>
      </div>

      {loading && <div className="card">불러오는 중...</div>}
      {error && <div className="card">{error}</div>}

      <section className="card">
        <h3>Profile</h3>
        <div className="form-grid">
          <label>
            Display name
            <input
              className="input"
              value={form.displayName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, displayName: event.target.value }))
              }
            />
          </label>
          <label>
            Job type
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
            {saving ? "저장 중..." : "저장됨"}
          </button>
          <div className="muted">
            {savedAt ? `마지막 저장 ${savedAt}` : "입력하면 자동 저장됩니다."}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
