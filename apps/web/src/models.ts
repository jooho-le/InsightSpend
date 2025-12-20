export type StressLog = {
  id: string;
  uid: string;
  date: string;
  mood: string;
  context: string;
  memo: string;
  score: number;
};

export type FinanceLog = {
  id: string;
  uid: string;
  date: string;
  category: string;
  amount: number;
  memo: string;
};
