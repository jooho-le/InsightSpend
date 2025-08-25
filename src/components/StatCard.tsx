export default function StatCard(props: {
    label: string; value: string; hint?: string;
}) {
    return (
        <div className="card">
            <div style={{ color: "var(--muted)", fontSize: 12 }}>{props.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{props.value}</div>
            {props.hint && <div style={{ marginTop: 6 }}><small className="muted">{props.hint}</small></div>}
        </div>
    );
}
