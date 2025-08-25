import { NavLink } from "react-router-dom";

const linkStyle: React.CSSProperties = {
    display: "block",
    padding: "10px 12px",
    borderRadius: 10,
    color: "var(--text)",
};

export default function Sidebar() {
    const active = ({ isActive }: { isActive: boolean }) =>
        ({
            ...linkStyle,
            background: isActive ? "rgba(92,200,255,.15)" : "transparent",
            border: isActive ? "1px solid var(--accent)" : "1px solid transparent"
        }) as React.CSSProperties;

    return (
        <nav style={{ display: "grid", gap: 8 }}>
            <NavLink to="/" style={active} end>대시보드</NavLink>
            <NavLink to="/diary" style={active}>일기</NavLink>
            <NavLink to="/ledger" style={active}>가계부</NavLink>
            <NavLink to="/analysis" style={active}>패턴 분석</NavLink>
            <NavLink to="/recommendations" style={active}>월간 추천</NavLink>
            <NavLink to="/rewards" style={active}>리워드</NavLink>
            <NavLink to="/share" style={active}>SNS 공유</NavLink>
            <div style={{ height: 16 }} />
            <small className="muted">Finance × Mood</small>
            <small className="muted">© {new Date().getFullYear()} FinMood</small>
        </nav>
    );
}
