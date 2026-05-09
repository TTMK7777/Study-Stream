export type Topic = {
  id: string;
  title: string;
  difficulty?: 1 | 2 | 3;
  tags: string[];
  promptHint?: string;
};

export type Subject = {
  id: string;
  title: string;
  examWeight: number;
  topics: Topic[];
};
