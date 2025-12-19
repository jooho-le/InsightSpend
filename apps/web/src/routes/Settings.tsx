import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import AppShell from "../components/AppShell";
import { useAuth } from "../auth";
import { db } from "../firebase";

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    jobType: "",
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const ref = doc(db, "users", user.uid);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          const data = snapshot.data() as { displayName?: string; jobType?: string };
          setForm({
            displayName: data.displayName ?? user.displayName ?? "",
            jobType: data.jobType ?? "",
          });
        } else {
          setForm({
            displayName: user.displayName ?? "",
            jobType: "",
          });
        }
      } catch (err) {
        setError("설정 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: form.displayName,
          jobType: form.jobType,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      setError("설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

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
          <button className="primary-button" onClick={save} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </section>
    </AppShell>
  );
}
