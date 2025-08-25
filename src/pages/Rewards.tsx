import { useEffect, useState } from "react";
import api from "@services/api";
import { Reward } from "../types";

export default function Rewards() {
    const [rewards, setRewards] = useState<Reward[]>([]);
    useEffect(() => { api.listRewards().then(setRewards); }, []);

    return (
        <div className="grid" style={{ gap: 16 }}>
            <div className="card">
                <h3 style={{ marginTop: 0 }}>리워드</h3>
                <table className="table">
                    <thead><tr><th>제목</th><th>조건</th><th>포인트</th><th>상태</th></tr></thead>
                    <tbody>
                    {rewards.map(r => (
                        <tr key={r.id}>
                            <td>{r.title}</td>
                            <td>{r.condition}</td>
                            <td className="mono">{r.points}</td>
                            <td>{r.achieved ? "달성" : "진행 중"}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                <div style={{ marginTop: 12, display:"flex", gap:8 }}>
                    <button className="button primary">포인트 사용(추가 예정)</button>
                    <button className="button">챌린지 둘러보기(추가 예정)</button>
                </div>
            </div>
        </div>
    );
}
