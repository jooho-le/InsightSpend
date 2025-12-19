import AppShell from "../components/AppShell";

export default function Settings() {
  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Settings</h1>
          <div className="muted">프로필 및 환경 설정을 구성합니다.</div>
        </div>
      </div>
      <section className="card">
        <h3>Profile</h3>
        <p className="muted">직군, 목표, 알림 옵션은 이후 단계에서 저장됩니다.</p>
      </section>
    </AppShell>
  );
}
