import { useEffect, useState } from "react";
import api from "@services/api";
import { RecommendationPack } from "../types";

export default function Recommendations() {
    const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
    const [pack, setPack] = useState<RecommendationPack | null>(null);

    useEffect(() => { api.getRecommendations(month).then(setPack); }, [month]);

    return (
        <div className="grid" style={{ gap: 16 }}>
            <div className="card">
                <h3 style={{ marginTop: 0 }}>월간 소비 방향</h3>
                <div style={{ display:"flex", gap:8 }}>
                    <input className="input" type="month" value={month} onChange={e => setMonth(e.target.value)} />
                    <button className="button">루틴 템플릿 관리(추가 예정)</button>
                </div>
            </div>

            <div className="card">
                <h4 style={{ marginTop: 0 }}>{month} 추천</h4>
                <ol>
                    {pack?.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ol>
                <div style={{ marginTop: 12 }}>
                    <strong>KPI</strong>
                    <ul>
                        {pack?.kpis.map(k => <li key={k.title}>{k.title}: {k.target}</li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
}
