import type { Question } from '@/data/questions';
import type { CoverageNode } from './types';
import { EXAMS, type ExamFamily } from '@/data/exams';

function emptyNode(id: string, level: CoverageNode['level'], label: string, examCode?: string): CoverageNode {
  return {
    id, level, label, examCode,
    targetCount: 0, totalCount: 0, generated: 0, underReview: 0,
    needsFix: 0, approved: 0, rejected: 0, used: 0, unused: 0,
    englishCount: 0, hindiCount: 0, punjabiCount: 0,
    easyCount: 0, moderateCount: 0, hardCount: 0,
    coveragePercentage: 0, gapCount: 0, children: [],
  };
}

function accumulateStats(node: CoverageNode, q: Question) {
  node.totalCount++;
  switch (q.status) {
    case 'Generated': node.generated++; break;
    case 'Under Review': node.underReview++; break;
    case 'Needs Fix': node.needsFix++; break;
    case 'Approved': node.approved++; break;
    case 'Rejected': node.rejected++; break;
  }
  if (q.usageCount > 0) node.used++; else node.unused++;
  if (q.language.includes('English')) node.englishCount++;
  if (q.language.includes('Hindi')) node.hindiCount++;
  if (q.language.includes('Punjabi')) node.punjabiCount++;
  if (q.difficulty === 'Easy') node.easyCount++;
  else if (q.difficulty === 'Moderate') node.moderateCount++;
  else node.hardCount++;
}

function finalizeNode(node: CoverageNode, targetCount: number) {
  node.targetCount = targetCount;
  node.gapCount = Math.max(0, targetCount - node.approved);
  node.coveragePercentage = targetCount > 0 ? Math.round((node.approved / targetCount) * 100) : 0;
}

export function calculateCoverageTree(
  questions: Question[],
  targets: Record<string, number> = {},
): CoverageNode[] {
  const families: Map<string, CoverageNode> = new Map();
  const examNodes: Map<string, CoverageNode> = new Map();
  const subjectNodes: Map<string, CoverageNode> = new Map();
  const chapterNodes: Map<string, CoverageNode> = new Map();
  const topicNodes: Map<string, CoverageNode> = new Map();
  const subtopicNodes: Map<string, CoverageNode> = new Map();

  for (const q of questions) {
    const exam = EXAMS.find((e) => e.code === q.exam);
    const familyName = exam?.family ?? 'Uncategorized';

    let familyNode = families.get(familyName);
    if (!familyNode) {
      familyNode = emptyNode(`family-${familyName}`, 'family', familyName);
      families.set(familyName, familyNode);
    }

    let examNode = examNodes.get(q.exam);
    if (!examNode) {
      examNode = emptyNode(`exam-${q.exam}`, 'exam', exam?.name ?? q.exam, q.exam);
      examNodes.set(q.exam, examNode);
      familyNode.children.push(examNode);
    }

    const subjectKey = `${q.exam}:${q.subject}`;
    let subjectNode = subjectNodes.get(subjectKey);
    if (!subjectNode) {
      subjectNode = emptyNode(`subject-${subjectKey}`, 'subject', q.subject, q.exam);
      subjectNodes.set(subjectKey, subjectNode);
      examNode.children.push(subjectNode);
    }

    const chapterKey = `${q.exam}:${q.subject}:${q.chapter}`;
    let chapterNode = chapterNodes.get(chapterKey);
    if (!chapterNode) {
      chapterNode = emptyNode(`chapter-${chapterKey}`, 'chapter', q.chapter, q.exam);
      chapterNodes.set(chapterKey, chapterNode);
      subjectNode.children.push(chapterNode);
    }

    const topicKey = `${q.exam}:${q.subject}:${q.chapter}:${q.topic}`;
    let topicNode = topicNodes.get(topicKey);
    if (!topicNode) {
      topicNode = emptyNode(`topic-${topicKey}`, 'topic', q.topic, q.exam);
      topicNodes.set(topicKey, topicNode);
      chapterNode.children.push(topicNode);
    }

    const subtopicKey = `${q.exam}:${q.subject}:${q.chapter}:${q.topic}:${q.subtopic}`;
    let subtopicNode = subtopicNodes.get(subtopicKey);
    if (!subtopicNode) {
      subtopicNode = emptyNode(`subtopic-${subtopicKey}`, 'subtopic', q.subtopic, q.exam);
      subtopicNodes.set(subtopicKey, subtopicNode);
      topicNode.children.push(subtopicNode);
    }

    for (const node of [familyNode, examNode, subjectNode, chapterNode, topicNode, subtopicNode]) {
      accumulateStats(node, q);
    }
  }

  for (const node of [...families.values(), ...examNodes.values(), ...subjectNodes.values(),
    ...chapterNodes.values(), ...topicNodes.values(), ...subtopicNodes.values()]) {
    const target = targets[node.id] ?? (node.level === 'subtopic' ? 5 : node.level === 'topic' ? 10 :
      node.level === 'chapter' ? 20 : node.level === 'subject' ? 50 : node.level === 'exam' ? 100 : 200);
    finalizeNode(node, target);
  }

  return [...families.values()];
}

export function flattenCoverage(nodes: CoverageNode[]): CoverageNode[] {
  const result: CoverageNode[] = [];
  const walk = (list: CoverageNode[]) => {
    for (const n of list) {
      result.push(n);
      if (n.children.length > 0) walk(n.children);
    }
  };
  walk(nodes);
  return result;
}

export function getCoverageGaps(nodes: CoverageNode[]): CoverageNode[] {
  return flattenCoverage(nodes).filter((n) => n.gapCount > 0);
}

export function getCoverageWarnings(nodes: CoverageNode[]): CoverageNode[] {
  return flattenCoverage(nodes).filter((n) => n.coveragePercentage < 70);
}

export function getExamFamilies(): { family: ExamFamily; examCount: number }[] {
  const families = new Map<string, number>();
  for (const e of EXAMS) {
    families.set(e.family, (families.get(e.family) ?? 0) + 1);
  }
  return [...families.entries()].map(([family, examCount]) => ({ family: family as ExamFamily, examCount }));
}
