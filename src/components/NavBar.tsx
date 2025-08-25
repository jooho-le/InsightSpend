export default function NavBar() {
    return (
        <>
            <strong style={{ letterSpacing: 0.3 }}>FinMood</strong>
            <span className="badge">베타</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <input className="input" placeholder="검색: 상점/카테고리/메모..." />
                <button className="button ghost">내 프로필</button>
            </div>
        </>
    );
}
