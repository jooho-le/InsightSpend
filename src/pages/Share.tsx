export default function Share() {
    return (
        <div className="card">
            <h3 style={{ marginTop: 0 }}>SNS 공유</h3>
            <p>대시보드/월간 카드 이미지를 생성해 공유합니다. (추가 예정)</p>
            <div className="grid cols-2">
                <div className="card">
                    <strong>프리셋</strong>
                    <ul>
                        <li>월간 소비 요약 카드</li>
                        <li>감정 × 지출 하이라이트</li>
                    </ul>
                    <button className="button primary">카드 생성</button>
                </div>
                <div className="card">
                    <strong>연동</strong>
                    <ul>
                        <li>인스타그램 (이미지 저장 후 업로드)</li>
                        <li>트위터/X (텍스트 + 이미지)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
