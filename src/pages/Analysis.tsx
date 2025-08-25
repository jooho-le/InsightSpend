import { useEffect, useState } from "react";
import api from "@services/api";
import { PatternInsight } from "../types";

export default function Analysis() {
    const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
    const [insight, setInsight] = useState<PatternInsight | null>(null);

    useEffect(() => {
        api.getMonthlyPatterns(month).then(setInsight);
    }, [month]);

    return (
        <div className="grid" style={{ gap: 16 }}>
            <div className="card">
                <h3 style={{ marginTop: 0 }}>소비-감정 패턴 분석</h3>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input className="input" type="month" value={month} onChange={e => setMonth(e.target.value)} />
                    <small className="muted">월 선택</small>
                </div>
            </div>

            <div className="card">
                <h4 style={{ marginTop: 0 }}>{month} 요약</h4>
                <p>{insight?.summary}</p>
                <ul>
                    {insight?.findings.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <div className="grid cols-3">
                    <div className="card"><strong>배달 지출 증감</strong><div>{Math.round((insight?.metrics.deliverySpendDelta||0)*100)}%</div></div>
                    <div className="card"><strong>충동구매 비율</strong><div>{Math.round((insight?.metrics.impulseRate||0)*100)}%</div></div>
                    <div className="card"><strong>감정-지출 상관</strong><div>{insight?.metrics.moodSpendCorr?.toFixed(2)}</div></div>
                </div>
            </div>
        </div>
    );
}
