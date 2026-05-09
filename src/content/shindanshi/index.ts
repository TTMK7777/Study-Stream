import type { Subject, Topic } from "./types";
import { keizai } from "./01-keizai";
import { zaimu } from "./02-zaimu";
import { keiei } from "./03-keiei";
import { unei } from "./04-unei";
import { keieihoumu } from "./05-keieihoumu";
import { jouhou } from "./06-jouhou";
import { chuusho } from "./07-chuusho";

export type { Subject, Topic };

export const subjects: readonly Subject[] = Object.freeze([
  keizai,
  zaimu,
  keiei,
  unei,
  keieihoumu,
  jouhou,
  chuusho,
]);

const topicIndex: Map<string, { topic: Topic; subject: Subject }> = (() => {
  const map = new Map<string, { topic: Topic; subject: Subject }>();
  for (const subject of subjects) {
    for (const topic of subject.topics) {
      map.set(topic.id, { topic, subject });
    }
  }
  return map;
})();

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

export function getTopicById(id: string): { topic: Topic; subject: Subject } | undefined {
  return topicIndex.get(id);
}
