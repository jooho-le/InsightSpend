type AdviceRule = {
  keywords: string[];
  advice: string;
  focus: string;
};

const empathyTemplates = [
  "말해줘서 고마워요. 지금 느끼는 감정이 충분히 이해돼요.",
  "그 상황이면 누구라도 부담을 느꼈을 거예요.",
  "최근에 많이 버텼다는 게 느껴져요. 잠깐 숨 고르자.",
];

const adviceRules: AdviceRule[] = [
  {
    keywords: ["마감", "deadline", "기한", "연장"],
    advice: "업무를 25분 단위로 쪼개고, 가장 급한 1개만 먼저 처리해요.",
    focus: "우선순위 정리",
  },
  {
    keywords: ["회의", "미팅", "발표", "보고"],
    advice: "핵심 포인트 3개만 적어두고, 나머지는 회의 중 보완해요.",
    focus: "핵심 정리",
  },
  {
    keywords: ["갈등", "피드백", "충돌", "불만"],
    advice: "지금 감정을 메모로 정리하고, 내일 오전에 차분히 전달해요.",
    focus: "감정 거리두기",
  },
  {
    keywords: ["집중", "산만", "딴생각"],
    advice: "주변 소음을 줄이고 10분 타이머로 시작해요.",
    focus: "집중 루틴",
  },
  {
    keywords: ["피곤", "졸림", "소진", "번아웃"],
    advice: "짧은 스트레칭과 물 한 잔으로 에너지 리셋을 해요.",
    focus: "에너지 회복",
  },
];

const defaultAdvice = {
  focus: "리듬 유지",
  advice: "오늘 했던 일 중 잘된 1가지를 적고 작은 휴식으로 마무리해요.",
};

export function buildChatResponse(input: string) {
  const lower = input.toLowerCase();
  const matched = adviceRules.find((rule) =>
    rule.keywords.some((word) => lower.includes(word))
  );
  const empathy = empathyTemplates[Math.floor(Math.random() * empathyTemplates.length)];
  const selected = matched ?? defaultAdvice;

  return [
    empathy,
    `이번 상황에서는 "${selected.focus}"에 집중해보면 좋아요.`,
    selected.advice,
  ].join(" ");
}
