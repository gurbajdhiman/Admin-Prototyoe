import { useMemo, useState } from 'react';
import {
  Sparkles, Wand2, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Pencil, FileText, ChevronDown, ChevronRight, Copy, Eye, Save, X, Layers,
  Plus, ScrollText, Ban, ArrowRight, UserCog, Flag, Trash2, Edit2, Play, ListChecks,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { GatedButton } from '@/components/shared/GatedAction';
import { showToast } from '@/components/shared/toast';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import { useGeneratedBatches, useGenerationRecipes } from '@/app/store/selectors';
import type {
  GeneratedBatch, GeneratedQuestion, GenerationRecipe, BatchStatus, GeneratedItemStatus,
} from '@/app/store/types';
import { canTransitionBatch, GENERATION_BATCH_STATUS } from '@/app/store/status-machines';
import type { Question } from '@/data/questions';
import { EXAMS, SUBJECTS, DIFFICULTIES, REVIEWERS } from '@/data/exams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ----------------------------------------------------------------------------
// Mock generation templates (seeded + deterministic)
// ----------------------------------------------------------------------------
const WORDS = ['CANDLE', 'BRIGHT', 'FLOWER', 'GARDEN', 'MARKET', 'SILVER', 'WINTER', 'SUMMER', 'NIGHT', 'MORNING'];
const TOPICS = ['RBI', 'Article 14', 'Mountbatten', 'NABARD', 'SEBI', 'Right to Equality', 'Independence Era', 'Constitution'];
const PATTERNS = ['MCQ-DEF-1', 'MCQ-CALC-1', 'MCQ-CODE-1', 'MCQ-SYN-1', 'MCQ-FILL-1', 'MCQ-SERIES-1'];

const STEM_GENERATORS: Record<string, ((s: number) => string)[]> = {
  'Quantitative Aptitude': [
    (s) => `If the cost price of an article is Rs. ${(s % 500 + 100)} and it is sold at a profit of ${(s % 20 + 5)}%, find the selling price.`,
    (s) => `A sum of Rs. ${(s % 9000 + 1000)} amounts to Rs. ${((s % 9000 + 1000) + (s % 800 + 200))} in ${(s % 3 + 2)} years at simple interest. Find the rate per annum.`,
    (s) => `A train ${(s % 200 + 100)} m long running at ${(s % 80 + 30)} km/h crosses a pole in how many seconds?`,
    (s) => `The average of ${(s % 6 + 4)} consecutive even numbers is ${(s % 30 + 10)}. Find the largest number.`,
    (s) => `If ${(s % 9 + 2)}x - ${(s % 7 + 1)} = ${(s % 20 + 5)}, find the value of ${(s % 4 + 2)}x + ${(s % 3 + 1)}.`,
    (s) => `A shopkeeper marks his goods ${(s % 40 + 20)}% above cost and allows a discount of ${(s % 20 + 5)}%. His profit percentage is:`,
  ],
  'Reasoning Ability': [
    (s) => `In a certain code, FRIEND is written as GSJFOE. How is ${WORDS[s % WORDS.length]} written in that code?`,
    (_s) => `Pointing to a photograph, a man said, "She is the daughter of my grandfather's only son." How is the girl related to the man?`,
    (_s) => `Statements: All cats are dogs. All dogs are animals. Conclusions: I. All cats are animals. II. Some animals are cats. Which follows?`,
    (_s) => `If South-East becomes North and North-East becomes West, what will West become?`,
    (_s) => `Find the next number in the series: 2, 6, 12, 20, 30, ?`,
    (s) => `In a certain code, WORD is written as XPS${(s % 4) + 1}. How is ${WORDS[(s + 3) % WORDS.length]} written in that code?`,
  ],
  'English Language': [
    (s) => `Choose the synonym of "${['DILIGENT', 'ABUNDANT', 'BENEVOLENT', 'EPHEMERAL', 'PRUDENT'][s % 5]}":`,
    (_s) => `Select the correctly spelled word:`,
    (s) => `Choose the antonym of "${['BENEVOLENT', 'EPHEMERAL', 'ABUNDANT', 'DILIGENT'][s % 4]}":`,
    (_s) => `Fill in the blank: The proposal was met with ____ enthusiasm by the committee.`,
    (_s) => `Identify the part of speech of the underlined word: She runs <u>quickly</u>.`,
    (_s) => `Choose the correct meaning of the idiom "to bite the bullet":`,
  ],
  'General Awareness': [
    (s) => `Which of the following statements about ${TOPICS[s % TOPICS.length]} is correct?`,
    (_s) => `The Reserve Bank of India was established in the year:`,
    (_s) => `Which Article of the Indian Constitution deals with the Right to Equality?`,
    (_s) => `Who among the following was the first Governor-General of independent India?`,
    (_s) => `NABARD was established in which year?`,
    (_s) => `Which of the following is a fundamental duty under the Indian Constitution?`,
  ],
  'Computer Knowledge': [
    (_s) => `A computer's RAM is classified as which type of memory?`,
    (_s) => `Which protocol is used to transfer web pages?`,
    (_s) => `Which of the following is the fastest memory in a computer?`,
    (_s) => `A program that translates high-level language into machine language is called a:`,
    (_s) => `Which of the following is used to resolve domain names to IP addresses?`,
    (_s) => `Which of the following is NOT an operating system?`,
  ],
  'Punjabi Language': [
    (_s) => `ਹੇਠ ਦਿੱਤੇ ਸ਼ਬਦਾਂ ਵਿੱਚੋਂ ਸਹੀ ਸ਼ਬਦ-ਜੋੜ ਚੁਣੋ:`,
    (s) => `"${['ਪ੍ਰਸ਼ਾਸਨ', 'ਵਿਦਿਆਰਥੀ', 'ਅਧਿਆਪਕ', 'ਸਤਿਕਾਰ'][s % 4]}" ਸ਼ਬਦ ਦਾ ਸਹੀ ਅਰਥ ਕੀ ਹੈ?`,
    (_s) => `ਕਿਹੜਾ ਸ਼ਬਦ ਸੰਯੁਕਤ ਵਿਅੰਜਨ ਦੀ ਵਰਤੋਂ ਨਾਲ ਬਣਿਆ ਹੈ?`,
    (s) => `"${['ਪੰਜਾਬ', 'ਵਿਦਿਆ', 'ਅਧਿਆਪਕ', 'ਪ੍ਰਸ਼ਾਸਨ'][s % 4]}" ਸ਼ਬਦ ਦੀ ਸਹੀ ਸਪੈਲਿੰਗ ਚੁਣੋ:`,
  ],
  'Current Affairs': [
    (_s) => `India's Chandrayaan-3 successfully landed on the Moon in which month and year?`,
    (s) => `Which city hosted the G20 Summit in ${['2023', '2022', '2024'][s % 3]}?`,
    (_s) => `Which of the following events took place most recently?`,
    (s) => `Who was appointed as the Chief Justice of India in ${['2023', '2022'][s % 2]}?`,
    (s) => `The Summer Olympics ${['2024', '2028'][s % 2]} will be hosted by which city?`,
    (_s) => `Which Indian state recently launched a major welfare scheme?`,
  ],
};

const OPTION_SETS: Record<string, string[][]> = {
  'Quantitative Aptitude': [
    ['Rs. 120', 'Rs. 110', 'Rs. 105', 'Rs. 125'], ['10%', '8%', '12%', '15%'], ['10 sec', '8 sec', '12 sec', '15 sec'],
    ['22', '20', '24', '26'], ['23', '19', '21', '25'], ['15%', '10%', '20%', '12%'],
  ],
  'Reasoning Ability': [
    ['DBOEMF', 'DBPNFM', 'DCOEMF', 'DBOEMG'], ['Daughter', 'Sister', 'Niece', 'Cousin'], ['Both follow', 'Only I follows', 'Only II follows', 'Neither follows'],
    ['North-East', 'South-East', 'North-West', 'South-West'], ['42', '40', '44', '36'], ['XPS', 'YQT', 'ZRU', 'WPR'],
  ],
  'English Language': [
    ['Hardworking', 'Lazy', 'Careless', 'Slow'], ['Accommodation', 'Accomodation', 'Acommodation', 'Accommodaton'], ['Cruel', 'Kind', 'Generous', 'Warm'],
    ['mixed', 'little', 'much', 'no'], ['Adverb', 'Adjective', 'Noun', 'Verb'], ['To endure a painful situation', 'To eat quickly', 'To fight', 'To celebrate'],
  ],
  'General Awareness': [
    ['1935', '1947', '1950', '1969'], ['Article 14', 'Article 19', 'Article 21', 'Article 32'], ['Lord Mountbatten', 'C. Rajagopalachari', 'Rajendra Prasad', 'Jawaharlal Nehru'],
    ['1982', '1969', '1975', '1991'], ['To safeguard public property', 'To pay taxes', 'To vote', 'To own property'], ['RBI', 'SBI', 'NABARD', 'SEBI'],
  ],
  'Computer Knowledge': [
    ['Volatile', 'Non-volatile', 'Read-only', 'Magnetic'], ['HTTP', 'FTP', 'SMTP', 'TCP'], ['Register', 'RAM', 'Cache', 'ROM'],
    ['Compiler', 'Interpreter', 'Assembler', 'Loader'], ['DNS', 'DHCP', 'NAT', 'VPN'], ['Microsoft Word', 'Linux', 'Windows', 'macOS'],
  ],
  'Punjabi Language': [
    ['ਪ੍ਰਸ਼ਾਸਨ', 'ਪ੍ਰਸ਼ਾਸਨ', 'ਪਰਸ਼ਾਸਨ', 'ਪ੍ਰਾਸਨ'], ['ਪ੍ਰਸ਼ਾਸਨ', 'ਪ੍ਰਸ਼ਾਸਨ', 'ਪਰਸ਼ਾਸਨ', 'ਪ੍ਰਾਸਨ'], ['ਪ੍ਰਸ਼ਾਸਨ', 'ਪਰਸ਼ਾਸਨ', 'ਪ੍ਰਸ਼ਾਸਨ', 'ਪ੍ਰਾਸਨ'],
    ['ਵਿਦਿਆਰਥੀ', 'ਵਿਦਆਰਥੀ', 'ਵਿਦਿਆਰਥੀ', 'ਵਿਦਆਰਥੀ'],
  ],
  'Current Affairs': [
    ['August 2023', 'July 2023', 'June 2023', 'September 2023'], ['New Delhi', 'Mumbai', 'Chennai', 'Kolkata'], ['Chandrayaan-3 landing', 'Gaganyaan launch', 'Mangalyaan orbit', 'Chandrayaan-2 launch'],
    ['Justice D. Y. Chandrachud', 'Justice U. U. Lalit', 'Justice N. V. Ramana', 'Justice S. A. Bobde'], ['Paris', 'Tokyo', 'Beijing', 'Los Angeles'], ['Rajasthan', 'Maharashtra', 'Tamil Nadu', 'Kerala'],
  ],
};

const EXPLANATION_GENERATORS: Record<string, ((s: number) => string)[]> = {
  'Quantitative Aptitude': [
    (s) => `Let CP = ${(s % 500 + 100)}. Profit% = ${(s % 20 + 5)}%. SP = CP × (1 + P/100) = ${(s % 500 + 100)} × ${(1 + (s % 20 + 5) / 100).toFixed(2)}.`,
    (_s) => `Using SI = P×R×T/100, rate = (SI × 100)/(P × T). Substituting the given values yields the result.`,
    (s) => `Speed = ${(s % 80 + 30)} km/h = ${(s % 80 + 30) * (5 / 18)} m/s. Time = Distance/Speed.`,
    (s) => `For consecutive even numbers with average A, the largest = A + (n-1). Here A = ${(s % 30 + 10)}.`,
    (_s) => `Solve for x first, then substitute into the second expression.`,
    (s) => `Let CP = 100. MP = ${(s % 40 + 120)}. SP = MP × (1 - d/100). Profit = SP - CP.`,
  ],
  'Reasoning Ability': [
    () => `Each letter is shifted by +1 in the alphabet to form the code.`,
    () => `Grandfather's only son = the man's father. Father's daughter = his own daughter.`,
    () => `By transitivity, all cats are animals (I). Since cats exist, some animals are cats (II) is valid.`,
    () => `Rotate the directions: each direction shifts by 135° clockwise.`,
    () => `The differences are 4, 6, 8, 10 — increasing by 2. Next difference is 12, so 30 + 12 = 42.`,
    () => `Apply the same letter-shifting rule used in the example.`,
  ],
  'English Language': [
    () => `Diligent means showing care and conscientious effort — hardworking.`,
    () => `The correct spelling is "Accommodation" — double c and double m.`,
    () => `The antonym of a benevolent (kind) person is cruel.`,
    () => `"Mixed enthusiasm" is the standard collocation for a varied response.`,
    () => `"Quickly" modifies the verb "runs", so it is an adverb.`,
    () => `"To bite the bullet" means to face a difficult or unpleasant situation bravely.`,
  ],
  'General Awareness': [
    () => `The RBI was established on 1 April 1935 under the RBI Act, 1934.`,
    () => `Article 14 guarantees equality before law and equal protection of laws.`,
    () => `Lord Mountbatten was the first Governor-General of independent India (1947-48).`,
    () => `NABARD was established on 12 July 1982.`,
    () => `Safeguarding public property is a fundamental duty under Article 51A.`,
    () => `The RBI is the central banking institution of India.`,
  ],
  'Computer Knowledge': [
    () => `RAM is volatile — its contents are lost when power is switched off.`,
    () => `HTTP (HyperText Transfer Protocol) is used to transfer web pages.`,
    () => `Registers are the fastest, located inside the CPU.`,
    () => `A compiler translates an entire high-level program into machine code at once.`,
    () => `DNS (Domain Name System) resolves domain names to IP addresses.`,
    () => `Microsoft Word is an application, not an operating system.`,
  ],
  'Punjabi Language': [
    () => `ਪ੍ਰਸ਼ਾਸਨ (administration) is the correct spelling with the conjunct consonant.`,
    () => `ਪ੍ਰਸ਼ਾਸਨ ਦਾ ਅਰਥ ਹੈ ਪ੍ਰਸ਼ਾਸਨ (administration)।`,
    () => `ਸੰਯੁਕਤ ਵਿਅੰਜਨ ਦੋ ਵਿਅੰਜਨਾਂ ਦੇ ਜੁੜਨ ਨਾਲ ਬਣਦਾ ਹੈ।`,
    () => `ਵਿਦਿਆਰਥੀ ਸ਼ਬਦ ਵਿੱਚ ਸਹੀ ਸਪੈਲਿੰਗ ਹੈ।`,
  ],
  'Current Affairs': [
    () => `Chandrayaan-3 landed on the Moon's south pole on 23 August 2023.`,
    () => `India hosted the G20 Summit in New Delhi in September 2023.`,
    () => `Chandrayaan-3's landing was the most recent milestone among the options.`,
    () => `Justice D. Y. Chandrachud was appointed CJI in November 2022.`,
    () => `Paris will host the Summer Olympics in 2024.`,
    () => `Rajasthan launched a major welfare scheme recently.`,
  ],
};

function generateMockStem(subject: string, seed: number): string {
  const fns = STEM_GENERATORS[subject] ?? STEM_GENERATORS['General Awareness'];
  return fns[Math.abs(seed) % fns.length](seed);
}
function generateMockOption(subject: string, idx: number, seed: number): string {
  const sets = OPTION_SETS[subject] ?? OPTION_SETS['General Awareness'];
  const set = sets[Math.abs(seed) % sets.length];
  return set[idx % set.length];
}
function generateMockExplanation(subject: string, seed: number): string {
  const fns = EXPLANATION_GENERATORS[subject] ?? EXPLANATION_GENERATORS['General Awareness'];
  return fns[Math.abs(seed) % fns.length](seed);
}

// ----------------------------------------------------------------------------
// Tone + helpers
// ----------------------------------------------------------------------------
type BadgeTone = 'default' | 'info' | 'success' | 'warning' | 'destructive' | 'neutral' | 'primary';

function batchStatusTone(status: BatchStatus): BadgeTone {
  switch (status) {
    case 'Running': return 'info';
    case 'Validation': return 'info';
    case 'Review': return 'primary';
    case 'Partially Approved': return 'warning';
    case 'Approved': return 'success';
    case 'Failed': return 'destructive';
    case 'Cancelled': return 'neutral';
    default: return 'default';
  }
}

function gqStatusTone(status: GeneratedItemStatus): BadgeTone {
  switch (status) {
    case 'Needs Fix': return 'warning';
    case 'Approved': return 'success';
    case 'Rejected': return 'destructive';
    default: return 'default';
  }
}

function validationResultTone(r: GeneratedQuestion['validationResult']): BadgeTone {
  if (r === 'Passed') return 'success';
  if (r === 'Issues') return 'warning';
  return 'neutral';
}

function progressForBatch(b: GeneratedBatch): number {
  if (b.count === 0) return 0;
  const reviewed = b.questions.filter((q) => q.status !== 'Unreviewed').length;
  return Math.round((reviewed / b.count) * 100);
}

function batchCounts(qs: GeneratedQuestion[]) {
  let approved = 0, rejected = 0, needsFix = 0, unreviewed = 0, duplicates = 0;
  for (const q of qs) {
    if (q.status === 'Approved') approved += 1;
    else if (q.status === 'Rejected') rejected += 1;
    else if (q.status === 'Needs Fix') needsFix += 1;
    else unreviewed += 1;
    if (q.duplicateOf) duplicates += 1;
  }
  return { approved, rejected, needsFix, unreviewed, duplicates, total: qs.length };
}

// Build a deterministic log trail for a mock generation run
function mockLogs(batchId: string, count: number): GeneratedBatch['logs'] {
  const t0 = Date.now();
  const mk = (offset: number, level: 'info' | 'warning' | 'error', message: string) => ({
    id: `${batchId}-log-${offset}`,
    timestamp: new Date(t0 + offset * 400).toISOString(),
    level, message,
  });
  return [
    mk(0, 'info', `Batch ${batchId} initialized`),
    mk(1, 'info', `Recipe loaded · subject=${'config'} · count=${count}`),
    mk(2, 'info', `Seeded RNG with ${Math.abs(count * 7919)}`),
    mk(3, 'info', `Generated ${count} candidate items`),
    mk(4, 'info', `Validation profile applied · ${Math.max(1, Math.floor(count / 4))} flagged for review`),
    mk(5, 'warning', `Duplicate detection: 0 near-identical matches`),
    mk(6, 'info', `Batch ready for review`),
  ];
}

// ----------------------------------------------------------------------------
// Edit draft + recipe form state
// ----------------------------------------------------------------------------
interface EditDraft {
  questionId: string;
  stem: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string;
}

const emptyRecipeDraft = (): Omit<GenerationRecipe, 'id' | 'createdAt' | 'updatedAt' | 'version'> => ({
  name: '',
  description: '',
  exam: EXAMS[0].code,
  subject: SUBJECTS[0],
  stage: undefined,
  chapter: undefined,
  topic: undefined,
  subtopic: undefined,
  languages: ['English'],
  difficultyDistribution: { Easy: 30, Moderate: 50, Hard: 20 },
  questionCount: 10,
  questionType: 'MCQ Single',
  patternSelection: [PATTERNS[0]],
  excludePreviousBatch: true,
  similarityThreshold: 0.85,
  validationProfile: 'Standard',
  assignedReviewer: REVIEWERS[0],
  dueDate: undefined,
  priority: 'Normal',
  seed: undefined,
  generatorVersion: 'mock-v1',
});

// ----------------------------------------------------------------------------
// Main page
// ----------------------------------------------------------------------------
export function QuestionStudioPage() {
  const { dispatch, audit, activeAdminName, addRecipe, updateRecipe, deleteRecipe, setBatchStatus } = usePrototypeStore();
  const batches = useGeneratedBatches();
  const recipes = useGenerationRecipes();

  // Manual generation config
  const [selectedExam, setSelectedExam] = useState<string>(EXAMS[0].code);
  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECTS[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(DIFFICULTIES[1]);
  const [count, setCount] = useState<number>(8);
  const [priority, setPriority] = useState<GeneratedBatch['priority']>('Normal');
  const [reviewer, setReviewer] = useState<string>(REVIEWERS[0]);
  const [loading, setLoading] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [showOriginalId, setShowOriginalId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, Set<string>>>({});

  // Recipe dialog state
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeDraft, setRecipeDraft] = useState<Omit<GenerationRecipe, 'id' | 'createdAt' | 'updatedAt' | 'version'>>(emptyRecipeDraft());

  const stats = useMemo(() => {
    const acc = { total: 0, approved: 0, rejected: 0, needsFix: 0, unreviewed: 0, duplicates: 0, inBank: 0, runtimeMs: 0, cost: 0 };
    for (const b of batches) {
      const c = batchCounts(b.questions);
      acc.total += c.total;
      acc.approved += c.approved;
      acc.rejected += c.rejected;
      acc.needsFix += c.needsFix;
      acc.unreviewed += c.unreviewed;
      acc.duplicates += c.duplicates;
      acc.inBank += b.questions.filter((q) => q.questionBankId).length;
      acc.runtimeMs += b.runtimeMs ?? 0;
      acc.cost += b.costMock ?? 0;
    }
    return acc;
  }, [batches]);

  // ---- generation ----
  const buildBatch = (opts: {
    exam: string; subject: string; difficulty: string; count: number;
    recipe?: GenerationRecipe; seed?: number;
  }): GeneratedBatch => {
    const safeCount = Math.min(20, Math.max(1, opts.count));
    const batchId = `BAT-${Date.now()}`;
    const seed = opts.seed ?? Math.floor(Math.random() * 100000);
    const now = new Date().toISOString();
    const questions: GeneratedQuestion[] = Array.from({ length: safeCount }).map((_, i) => {
      const s = seed + i;
      return {
        id: `GQ-${Date.now()}-${i}`,
        batchId,
        seed: s,
        stem: generateMockStem(opts.subject, s),
        options: [
          { id: 'A', text: generateMockOption(opts.subject, 0, s) },
          { id: 'B', text: generateMockOption(opts.subject, 1, s) },
          { id: 'C', text: generateMockOption(opts.subject, 2, s) },
          { id: 'D', text: generateMockOption(opts.subject, 3, s) },
        ],
        correctOption: 'A',
        explanation: generateMockExplanation(opts.subject, s),
        status: 'Unreviewed' as const,
        patternId: PATTERNS[s % PATTERNS.length],
        generatorVersion: opts.recipe?.generatorVersion ?? 'mock-v1',
        validationScore: 70 + (s % 25),
        validationResult: (s % 5 === 0 ? 'Issues' : 'Passed') as 'Passed' | 'Issues',
        reviewer: undefined,
        questionBankId: undefined,
      };
    });
    return {
      id: batchId, createdAt: now,
      exam: opts.exam, subject: opts.subject, difficulty: opts.difficulty,
      count: safeCount, seed, questions,
      status: 'Draft' as const,
      recipeId: opts.recipe?.id,
      priority, reviewer,
      generatorVersion: opts.recipe?.generatorVersion ?? 'mock-v1',
      runtimeMs: 1200 + safeCount * 35,
      costMock: safeCount * 0.12,
      logs: mockLogs(batchId, safeCount),
    };
  };

  const generateFromConfig = () => {
    const safeCount = Math.min(20, Math.max(5, count));
    setLoading(true);
    setTimeout(() => {
      const batch = buildBatch({ exam: selectedExam, subject: selectedSubject, difficulty: selectedDifficulty, count: safeCount });
      const entry = audit('BATCH_GENERATED', 'audit', batch.id, batch.id.slice(-6), '-', `${safeCount} items`,
        `Generated ${safeCount} ${selectedSubject} items for ${selectedExam}`);
      dispatch({ type: 'ADD_GENERATED_BATCH', batch, audit: entry });
      setExpandedBatchId(batch.id);
      setLoading(false);
      showToast.success('Batch generated', `${safeCount} items queued as Draft.`);
    }, 1200);
  };

  const generateFromRecipe = (recipe: GenerationRecipe) => {
    setLoading(true);
    setTimeout(() => {
      const batch = buildBatch({
        exam: recipe.exam, subject: recipe.subject,
        difficulty: recipe.difficultyDistribution.Hard > 30 ? 'Hard' : 'Moderate',
        count: Math.min(20, recipe.questionCount), recipe, seed: recipe.seed,
      });
      const entry = audit('BATCH_GENERATED_FROM_RECIPE', 'audit', batch.id, recipe.name, '-', `${batch.count} items`,
        `Generated ${batch.count} items from recipe "${recipe.name}"`);
      dispatch({ type: 'ADD_GENERATED_BATCH', batch, audit: entry });
      setExpandedBatchId(batch.id);
      setLoading(false);
      showToast.success('Generated from recipe', `${batch.count} items from "${recipe.name}".`);
    }, 1200);
  };

  // ---- batch mutations ----
  const updateBatch = (batch: GeneratedBatch) => dispatch({ type: 'UPDATE_GENERATED_BATCH', batch });

  const updateQuestion = (batch: GeneratedBatch, questionId: string, updater: (q: GeneratedQuestion) => GeneratedQuestion) => {
    const questions = batch.questions.map((q) => (q.id === questionId ? updater(q) : q));
    const next = computeBatchStatusFromQuestions(questions, batch.status);
    updateBatch({ ...batch, questions, status: next });
  };

  // Derive lifecycle status from item statuses where sensible
  const computeBatchStatusFromQuestions = (qs: GeneratedQuestion[], current: BatchStatus): BatchStatus => {
    const c = batchCounts(qs);
    if (c.total === 0) return current;
    if (c.approved === c.total) return 'Approved';
    if (c.approved > 0 && c.approved < c.total) {
      return canTransitionBatch(current, 'Partially Approved') ? 'Partially Approved' : current;
    }
    // keep current if not yet in a review-ish state
    return current;
  };

  const transitionBatch = (batch: GeneratedBatch, to: BatchStatus, label: string) => {
    if (!canTransitionBatch(batch.status, to)) {
      showToast.error('Invalid transition', `Cannot move ${batch.id.slice(-6)} from ${batch.status} → ${to}.`);
      return;
    }
    setBatchStatus(batch.id, to);
    showToast.success(label, `${batch.id.slice(-6)} is now ${to}.`);
  };

  const regenerateStem = (batch: GeneratedBatch, q: GeneratedQuestion) => {
    const newSeed = q.seed + 1;
    updateQuestion(batch, q.id, (cur) => ({
      ...cur, seed: newSeed,
      originalStem: cur.originalStem ?? cur.stem,
      stem: generateMockStem(batch.subject, newSeed),
    }));
    showToast.info('Stem regenerated', 'A new variation has been generated.');
  };
  const regenerateOptions = (batch: GeneratedBatch, q: GeneratedQuestion) => {
    const newSeed = q.seed + 1;
    updateQuestion(batch, q.id, (cur) => ({
      ...cur, seed: newSeed,
      originalOptions: cur.originalOptions ?? cur.options,
      options: [
        { id: 'A', text: generateMockOption(batch.subject, 0, newSeed) },
        { id: 'B', text: generateMockOption(batch.subject, 1, newSeed) },
        { id: 'C', text: generateMockOption(batch.subject, 2, newSeed) },
        { id: 'D', text: generateMockOption(batch.subject, 3, newSeed) },
      ],
    }));
    showToast.info('Options regenerated', 'New option set has been generated.');
  };
  const regenerateExplanation = (batch: GeneratedBatch, q: GeneratedQuestion) => {
    const newSeed = q.seed + 1;
    updateQuestion(batch, q.id, (cur) => ({
      ...cur, seed: newSeed,
      originalExplanation: cur.originalExplanation ?? cur.explanation,
      explanation: generateMockExplanation(batch.subject, newSeed),
    }));
    showToast.info('Explanation regenerated', 'A new explanation has been generated.');
  };

  const duplicateVariation = (batch: GeneratedBatch, q: GeneratedQuestion) => {
    const copy: GeneratedQuestion = {
      ...q,
      id: `GQ-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: 'Unreviewed',
      questionBankId: undefined,
      reviewer: undefined,
      originalStem: undefined, originalOptions: undefined, originalExplanation: undefined,
      duplicateOf: q.id,
    };
    const questions = [...batch.questions, copy];
    updateBatch({ ...batch, questions });
    showToast.success('Variation duplicated', 'A new unreviewed copy was added to the batch.');
  };

  const retryFailedItems = (batch: GeneratedBatch) => {
    const failed = batch.questions.filter((q) => q.status === 'Rejected' || q.validationResult === 'Issues');
    if (failed.length === 0) {
      showToast.info('Nothing to retry', 'No failed or flagged items in this batch.');
      return;
    }
    const questions = batch.questions.map((q) => {
      if (q.status === 'Rejected' || q.validationResult === 'Issues') {
        const newSeed = q.seed + 7;
        return {
          ...q, seed: newSeed,
          stem: generateMockStem(batch.subject, newSeed),
          options: [
            { id: 'A', text: generateMockOption(batch.subject, 0, newSeed) },
            { id: 'B', text: generateMockOption(batch.subject, 1, newSeed) },
            { id: 'C', text: generateMockOption(batch.subject, 2, newSeed) },
            { id: 'D', text: generateMockOption(batch.subject, 3, newSeed) },
          ],
          explanation: generateMockExplanation(batch.subject, newSeed),
          status: 'Unreviewed' as const,
          validationResult: 'Pending' as const,
          validationScore: undefined,
          reviewer: undefined,
        };
      }
      return q;
    });
    updateBatch({ ...batch, questions });
    showToast.success('Retried failed items', `${failed.length} item(s) regenerated as Unreviewed.`);
  };

  const duplicateBatch = (batch: GeneratedBatch) => {
    const newId = `BAT-${Date.now()}`;
    const copy: GeneratedBatch = {
      ...batch, id: newId, createdAt: new Date().toISOString(),
      status: 'Draft', runtimeMs: undefined, costMock: undefined,
      questions: batch.questions.map((q) => ({
        ...q, id: `GQ-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        batchId: newId, status: 'Unreviewed' as const,
        questionBankId: undefined, reviewer: undefined,
        originalStem: undefined, originalOptions: undefined, originalExplanation: undefined,
      })),
    };
    const entry = audit('BATCH_DUPLICATED', 'audit', newId, batch.id, '-', newId, `Duplicated batch ${batch.id.slice(-6)}`);
    dispatch({ type: 'ADD_GENERATED_BATCH', batch: copy, audit: entry });
    showToast.success('Batch duplicated', `${newId.slice(-6)} created as Draft.`);
  };

  const changePriority = (batch: GeneratedBatch, p: GeneratedBatch['priority']) => {
    updateBatch({ ...batch, priority: p });
    showToast.success('Priority updated', `${batch.id.slice(-6)} → ${p}.`);
  };
  const assignReviewer = (batch: GeneratedBatch, r: string) => {
    updateBatch({ ...batch, reviewer: r });
    showToast.success('Reviewer assigned', `${batch.id.slice(-6)} → ${r}.`);
  };

  const setItemStatus = (batch: GeneratedBatch, q: GeneratedQuestion, status: GeneratedItemStatus, label: string) => {
    updateQuestion(batch, q.id, (cur) => ({ ...cur, status, reviewer: activeAdminName }));
    if (status === 'Rejected') showToast.error('Question rejected', label);
    else if (status === 'Needs Fix') showToast.warning('Marked for fix', label);
    else showToast.success(label, 'Question status updated.');
  };

  const approveToBank = (batch: GeneratedBatch, q: GeneratedQuestion) => {
    if (q.questionBankId) {
      showToast.info('Already in bank', `Linked to ${q.questionBankId}.`);
      return;
    }
    const question: Question = {
      id: `Q-${Date.now()}`,
      stem: q.stem, stemPunjabi: undefined,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      correctOption: q.correctOption, explanation: q.explanation,
      subject: batch.subject, chapter: 'Generated', topic: 'AI Generated',
      subtopic: 'Batch ' + batch.id.slice(-4), difficulty: batch.difficulty,
      language: ['English'], exam: batch.exam, type: 'MCQ Single',
      status: 'Approved', source: 'AI Generated', author: activeAdminName, reviewer: activeAdminName,
      validationStatus: 'Passed', validationScore: q.validationScore ?? 80,
      usageCount: 0, studentAccuracy: 0, avgResponseSec: 0,
      createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10),
    };
    const entry = audit('QUESTION_APPROVED_FROM_STUDIO', 'question', question.id, q.stem.slice(0, 40), q.status, 'Approved',
      'Question approved from Studio and added to the bank');
    dispatch({ type: 'ADD_QUESTION', question, audit: entry });
    updateQuestion(batch, q.id, (cur) => ({ ...cur, status: 'Approved', questionBankId: question.id, reviewer: activeAdminName }));
    showToast.success('Approved to Question Bank', `${question.id} added.`);
  };

  const approveSelectedToBank = (batch: GeneratedBatch) => {
    const selected = selectedItemIds[batch.id];
    if (!selected || selected.size === 0) {
      showToast.info('Nothing selected', 'Select items using the checkboxes first.');
      return;
    }
    let added = 0;
    const questions = batch.questions.map((q) => {
      if (!selected.has(q.id) || q.questionBankId || q.status === 'Approved') return q;
      const question: Question = {
        id: `Q-${Date.now()}-${added}`,
        stem: q.stem, stemPunjabi: undefined,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
        correctOption: q.correctOption, explanation: q.explanation,
        subject: batch.subject, chapter: 'Generated', topic: 'AI Generated',
        subtopic: 'Batch ' + batch.id.slice(-4), difficulty: batch.difficulty,
        language: ['English'], exam: batch.exam, type: 'MCQ Single',
        status: 'Approved', source: 'AI Generated', author: activeAdminName, reviewer: activeAdminName,
        validationStatus: 'Passed', validationScore: q.validationScore ?? 80,
        usageCount: 0, studentAccuracy: 0, avgResponseSec: 0,
        createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10),
      };
      const entry = audit('QUESTION_APPROVED_FROM_STUDIO', 'question', question.id, q.stem.slice(0, 40), q.status, 'Approved',
        'Approved via batch selection');
      dispatch({ type: 'ADD_QUESTION', question, audit: entry });
      added += 1;
      return { ...q, status: 'Approved' as const, questionBankId: question.id, reviewer: activeAdminName };
    });
    updateBatch({ ...batch, questions });
    setSelectedItemIds((cur) => ({ ...cur, [batch.id]: new Set() }));
    if (added > 0) showToast.success('Approved to Question Bank', `${added} item(s) added.`);
    else showToast.info('No new approvals', 'Selected items were already approved.');
  };

  const toggleSelected = (batchId: string, qId: string, checked: boolean) => {
    setSelectedItemIds((cur) => {
      const set = new Set(cur[batchId] ?? []);
      if (checked) set.add(qId); else set.delete(qId);
      return { ...cur, [batchId]: set };
    });
  };

  // ---- recipe CRUD ----
  const openCreateRecipe = () => {
    setEditingRecipeId(null);
    setRecipeDraft(emptyRecipeDraft());
    setRecipeDialogOpen(true);
  };
  const openEditRecipe = (r: GenerationRecipe) => {
    setEditingRecipeId(r.id);
    const { id, createdAt, updatedAt, version, ...rest } = r;
    void id; void createdAt; void updatedAt; void version;
    setRecipeDraft({ ...rest });
    setRecipeDialogOpen(true);
  };
  const duplicateRecipe = (r: GenerationRecipe) => {
    const newId = `RCP-${Date.now()}`;
    const now = new Date().toISOString();
    const copy: GenerationRecipe = {
      ...r, id: newId, name: `${r.name} (copy)`, version: 1, createdAt: now, updatedAt: now,
    };
    addRecipe(copy);
    showToast.success('Recipe duplicated', `${copy.name} created.`);
  };
  const removeRecipe = (r: GenerationRecipe) => {
    deleteRecipe(r.id);
    showToast.success('Recipe deleted', r.name);
  };
  const saveRecipeDraft = () => {
    if (!recipeDraft.name.trim()) {
      showToast.error('Name required', 'Give the recipe a name before saving.');
      return;
    }
    const now = new Date().toISOString();
    if (editingRecipeId) {
      const existing = recipes.find((r) => r.id === editingRecipeId);
      const updated: GenerationRecipe = {
        ...(existing ?? {} as GenerationRecipe),
        ...recipeDraft, id: editingRecipeId,
        version: (existing?.version ?? 1) + 1, updatedAt: now,
      } as GenerationRecipe;
      updateRecipe(updated);
      showToast.success('Recipe updated', updated.name);
    } else {
      const newId = `RCP-${Date.now()}`;
      const created: GenerationRecipe = {
        ...recipeDraft, id: newId, version: 1, createdAt: now, updatedAt: now,
      } as GenerationRecipe;
      addRecipe(created);
      showToast.success('Recipe created', created.name);
    }
    setRecipeDialogOpen(false);
  };

  const startEdit = (q: GeneratedQuestion) => {
    setEditDraft({
      questionId: q.id, stem: q.stem,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      correctOption: q.correctOption, explanation: q.explanation,
    });
  };
  const saveEdit = (batch: GeneratedBatch) => {
    if (!editDraft) return;
    updateQuestion(batch, editDraft.questionId, (cur) => ({
      ...cur, stem: editDraft.stem, options: editDraft.options,
      correctOption: editDraft.correctOption, explanation: editDraft.explanation,
    }));
    setEditDraft(null);
    showToast.success('Question saved', 'Edits applied.');
  };

  const examName = (code: string) => EXAMS.find((e) => e.code === code)?.name ?? code;

  return (
    <div>
      <PageHeader
        title="Question Studio"
        description="AI-assisted question generation — recipes, batch lifecycle, review and approve into the Question Bank."
        icon={<Sparkles className="h-5 w-5" />}
        actions={<Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/10 px-3 py-1 text-primary"><Sparkles className="h-3.5 w-3.5" /> Visual Prototype</Badge>}
      />

      {/* Stats summary */}
      {batches.length > 0 && (
        <Card className="mb-4">
          <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-8">
            <Stat label="Batches" value={batches.length} />
            <Stat label="Items" value={stats.total} />
            <Stat label="Approved" value={stats.approved} tone="text-success" />
            <Stat label="In Bank" value={stats.inBank} tone="text-success" />
            <Stat label="Needs Fix" value={stats.needsFix} tone="text-warning" />
            <Stat label="Rejected" value={stats.rejected} tone="text-destructive" />
            <Stat label="Duplicates" value={stats.duplicates} tone="text-muted-foreground" />
            <Stat label="Cost (mock)" value={`₹${stats.cost.toFixed(2)}`} />
          </CardContent>
        </Card>
      )}

      {/* Recipes */}
      <RecipeSection
        recipes={recipes}
        examName={examName}
        onCreate={openCreateRecipe}
        onEdit={openEditRecipe}
        onDuplicate={duplicateRecipe}
        onDelete={removeRecipe}
        onGenerate={generateFromRecipe}
        disabled={loading}
      />

      {/* Manual generation config */}
      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Manual Generation Config</CardTitle>
          <Badge variant="secondary" className="gap-1.5 text-[10px]">
            <Layers className="h-3 w-3" /> {batches.length} batch{batches.length === 1 ? '' : 'es'}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <Label className="mb-1.5 block text-xs">Exam</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{EXAMS.map((e) => <SelectItem key={e.code} value={e.code}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Difficulty</Label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Count (5-20)</Label>
              <Input type="number" min={5} max={20} value={count}
                onChange={(e) => setCount(Math.min(20, Math.max(5, Number(e.target.value) || 5)))} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as GeneratedBatch['priority'])}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{(['Low', 'Normal', 'High'] as const).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Reviewer</Label>
              <Select value={reviewer} onValueChange={setReviewer}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{REVIEWERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Generates a deterministic mock batch as <strong>Draft</strong>. Use the batch actions to advance the lifecycle.
            </p>
            <GatedButton permission="studio.use" onClick={generateFromConfig} disabled={loading} size="default" className="sm:w-auto">
              {loading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <><Wand2 className="mr-2 h-4 w-4" /> Generate Batch</>}
            </GatedButton>
          </div>
        </CardContent>
      </Card>

      {/* Batches */}
      <div className="space-y-4">
        {batches.length === 0 && !loading && (
          <EmptyState
            icon={<Sparkles className="h-7 w-7" />}
            title="No questions generated yet"
            description="Configure parameters above or use a recipe, then generate a batch for review."
            action={
              <GatedButton permission="studio.use" onClick={generateFromConfig} variant="outline" size="sm">
                <Wand2 className="mr-1.5 h-4 w-4" /> Generate First Batch
              </GatedButton>
            }
          />
        )}

        {loading && (
          <Card className="p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><RefreshCw className="h-7 w-7 animate-spin" /></div>
              <div>
                <p className="font-display text-lg font-semibold text-foreground">Generating questions…</p>
                <p className="mt-1 text-sm text-muted-foreground">AI is composing {count} questions for {selectedSubject}</p>
              </div>
              <Progress value={66} className="mt-2 max-w-xs" />
            </div>
          </Card>
        )}

        {batches.map((batch) => (
          <BatchCard
            key={batch.id}
            batch={batch}
            examName={examName(batch.exam)}
            expanded={expandedBatchId === batch.id}
            selectedIds={selectedItemIds[batch.id] ?? new Set<string>()}
            onToggle={() => setExpandedBatchId((cur) => (cur === batch.id ? null : batch.id))}
            editDraft={editDraft}
            showOriginalId={showOriginalId}
            onStartEdit={startEdit}
            onCancelEdit={() => setEditDraft(null)}
            onSaveEdit={() => saveEdit(batch)}
            onUpdateEditDraft={setEditDraft}
            onToggleOriginal={(id) => setShowOriginalId((cur) => (cur === id ? null : id))}
            onRegenerateStem={(q) => regenerateStem(batch, q)}
            onRegenerateOptions={(q) => regenerateOptions(batch, q)}
            onRegenerateExplanation={(q) => regenerateExplanation(batch, q)}
            onDuplicateItem={(q) => duplicateVariation(batch, q)}
            onApprove={(q) => approveToBank(batch, q)}
            onReject={(q) => setItemStatus(batch, q, 'Rejected', 'Question rejected')}
            onNeedsFix={(q) => setItemStatus(batch, q, 'Needs Fix', 'Marked for fix')}
            onToggleSelected={(qId, checked) => toggleSelected(batch.id, qId, checked)}
            onTransition={(to, label) => transitionBatch(batch, to, label)}
            onRetryFailed={() => retryFailedItems(batch)}
            onDuplicateBatch={() => duplicateBatch(batch)}
            onChangePriority={(p) => changePriority(batch, p)}
            onAssignReviewer={(r) => assignReviewer(batch, r)}
            onApproveSelected={() => approveSelectedToBank(batch)}
          />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Visual prototype only — no real AI generation is performed. All content is mock data derived from seeded templates.
      </p>

      {/* Recipe create/edit dialog */}
      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{editingRecipeId ? 'Edit Recipe' : 'New Generation Recipe'}</DialogTitle>
            <DialogDescription className="sr-only">Recipe form</DialogDescription>
          </DialogHeader>
          <RecipeForm draft={recipeDraft} onChange={setRecipeDraft} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecipeDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveRecipeDraft}><Save className="mr-1.5 h-4 w-4" /> Save Recipe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Recipe section
// ----------------------------------------------------------------------------
interface RecipeSectionProps {
  recipes: GenerationRecipe[];
  examName: (code: string) => string;
  onCreate: () => void;
  onEdit: (r: GenerationRecipe) => void;
  onDuplicate: (r: GenerationRecipe) => void;
  onDelete: (r: GenerationRecipe) => void;
  onGenerate: (r: GenerationRecipe) => void;
  disabled: boolean;
}

function RecipeSection({ recipes, examName, onCreate, onEdit, onDuplicate, onDelete, onGenerate, disabled }: RecipeSectionProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Generation Recipes</CardTitle>
        <GatedButton permission="studio.use" onClick={onCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> New Recipe
        </GatedButton>
      </CardHeader>
      <CardContent>
        {recipes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">No recipes yet. Create one to codify a reusable generation config.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {recipes.map((r) => (
              <div key={r.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.description || 'No description'}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">v{r.version}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <Badge variant="secondary">{examName(r.exam)}</Badge>
                  <Badge variant="secondary">{r.subject}</Badge>
                  <Badge variant="secondary">{r.questionCount} Q</Badge>
                  <Badge variant={r.priority === 'High' ? 'destructive' : r.priority === 'Low' ? 'outline' : 'secondary'}>{r.priority}</Badge>
                  {r.assignedReviewer && <Badge variant="outline">{r.assignedReviewer}</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <GatedButton permission="studio.use" onClick={() => onGenerate(r)} size="sm" className="h-7 text-xs" disabled={disabled}>
                    <Play className="mr-1 h-3.5 w-3.5" /> Generate
                  </GatedButton>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEdit(r)}>
                    <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onDuplicate(r)}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(r)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Recipe form (inside Dialog)
// ----------------------------------------------------------------------------
function RecipeForm({
  draft, onChange,
}: {
  draft: Omit<GenerationRecipe, 'id' | 'createdAt' | 'updatedAt' | 'version'>;
  onChange: (d: Omit<GenerationRecipe, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => void;
}) {
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => onChange({ ...draft, [key]: value });
  const setDist = (key: 'Easy' | 'Moderate' | 'Hard' | 'Expert', value: number) =>
    onChange({ ...draft, difficultyDistribution: { ...draft.difficultyDistribution, [key]: value } });
  const toggleLang = (lang: string) => {
    const has = draft.languages.includes(lang);
    onChange({ ...draft, languages: has ? draft.languages.filter((l) => l !== lang) : [...draft.languages, lang] });
  };
  const togglePattern = (p: string) => {
    const has = draft.patternSelection.includes(p);
    onChange({ ...draft, patternSelection: has ? draft.patternSelection.filter((x) => x !== p) : [...draft.patternSelection, p] });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-xs">Name</Label>
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. SSC CGL Quant Batch A" />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-xs">Description</Label>
          <Textarea value={draft.description} onChange={(e) => set('description', e.target.value)} rows={2} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Exam</Label>
          <Select value={draft.exam} onValueChange={(v) => set('exam', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{EXAMS.map((e) => <SelectItem key={e.code} value={e.code}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Subject</Label>
          <Select value={draft.subject} onValueChange={(v) => set('subject', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Chapter</Label>
          <Input value={draft.chapter ?? ''} onChange={(e) => set('chapter', e.target.value || undefined)} placeholder="optional" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Topic</Label>
          <Input value={draft.topic ?? ''} onChange={(e) => set('topic', e.target.value || undefined)} placeholder="optional" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Question Count</Label>
          <Input type="number" min={1} max={50} value={draft.questionCount} onChange={(e) => set('questionCount', Math.min(50, Math.max(1, Number(e.target.value) || 1)))} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Question Type</Label>
          <Select value={draft.questionType} onValueChange={(v) => set('questionType', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{['MCQ Single', 'MCQ Multiple', 'Fill in the Blank', 'Match the Following', 'Assertion-Reason'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Priority</Label>
          <Select value={draft.priority} onValueChange={(v) => set('priority', v as GenerationRecipe['priority'])}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{(['Low', 'Normal', 'High'] as const).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Assigned Reviewer</Label>
          <Select value={draft.assignedReviewer ?? REVIEWERS[0]} onValueChange={(v) => set('assignedReviewer', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{REVIEWERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Validation Profile</Label>
          <Select value={draft.validationProfile} onValueChange={(v) => set('validationProfile', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{['Standard', 'Strict', 'Lenient'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Similarity Threshold</Label>
          <Input type="number" min={0} max={1} step={0.05} value={draft.similarityThreshold}
            onChange={(e) => set('similarityThreshold', Math.min(1, Math.max(0, Number(e.target.value) || 0)))} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Generator Version</Label>
          <Input value={draft.generatorVersion} onChange={(e) => set('generatorVersion', e.target.value)} />
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">Difficulty Distribution (%)</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {(['Easy', 'Moderate', 'Hard', 'Expert'] as const).map((k) => (
            <div key={k}>
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{k}</span>
              <Input type="number" min={0} max={100} value={draft.difficultyDistribution[k] ?? 0}
                onChange={(e) => setDist(k, Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className="h-8" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">Languages</Label>
        <div className="flex flex-wrap gap-3">
          {['English', 'Hindi', 'Punjabi'].map((l) => (
            <label key={l} className="flex items-center gap-2 text-sm">
              <Checkbox checked={draft.languages.includes(l)} onCheckedChange={() => toggleLang(l)} />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">Pattern Selection</Label>
        <div className="flex flex-wrap gap-2">
          {PATTERNS.map((p) => (
            <button key={p} type="button" onClick={() => togglePattern(p)}
              className={cn('rounded-md border px-2.5 py-1 text-xs',
                draft.patternSelection.includes(p) ? 'border-primary bg-primary/10 text-primary' : 'bg-card text-muted-foreground')}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={draft.excludePreviousBatch} onCheckedChange={(v) => set('excludePreviousBatch', v === true)} />
        Exclude items from previous batch
      </label>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Stat + MiniStat
// ----------------------------------------------------------------------------
function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-lg font-bold', tone ?? 'text-foreground')}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border bg-muted/30 px-2.5 py-1">
      <span className={cn('text-sm font-bold', tone)}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// BatchCard
// ----------------------------------------------------------------------------
interface BatchCardProps {
  batch: GeneratedBatch;
  examName: string;
  expanded: boolean;
  selectedIds: Set<string>;
  onToggle: () => void;
  editDraft: EditDraft | null;
  showOriginalId: string | null;
  onStartEdit: (q: GeneratedQuestion) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUpdateEditDraft: (d: EditDraft) => void;
  onToggleOriginal: (id: string) => void;
  onRegenerateStem: (q: GeneratedQuestion) => void;
  onRegenerateOptions: (q: GeneratedQuestion) => void;
  onRegenerateExplanation: (q: GeneratedQuestion) => void;
  onDuplicateItem: (q: GeneratedQuestion) => void;
  onApprove: (q: GeneratedQuestion) => void;
  onReject: (q: GeneratedQuestion) => void;
  onNeedsFix: (q: GeneratedQuestion) => void;
  onToggleSelected: (qId: string, checked: boolean) => void;
  onTransition: (to: BatchStatus, label: string) => void;
  onRetryFailed: () => void;
  onDuplicateBatch: () => void;
  onChangePriority: (p: GeneratedBatch['priority']) => void;
  onAssignReviewer: (r: string) => void;
  onApproveSelected: () => void;
}

function BatchCard({
  batch, examName, expanded, selectedIds, onToggle, editDraft, showOriginalId,
  onStartEdit, onCancelEdit, onSaveEdit, onUpdateEditDraft, onToggleOriginal,
  onRegenerateStem, onRegenerateOptions, onRegenerateExplanation, onDuplicateItem,
  onApprove, onReject, onNeedsFix, onToggleSelected,
  onTransition, onRetryFailed, onDuplicateBatch, onChangePriority, onAssignReviewer, onApproveSelected,
}: BatchCardProps) {
  const c = batchCounts(batch.questions);
  const progress = progressForBatch(batch);
  const validTransitions = GENERATION_BATCH_STATUS.filter((s) => canTransitionBatch(batch.status, s));
  const [showLogs, setShowLogs] = useState(false);

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-4 text-left">
            {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-foreground">{batch.id}</span>
                <StatusBadge tone={batchStatusTone(batch.status)} dot className="text-[10px]">{batch.status}</StatusBadge>
                {batch.priority && <Badge variant="outline" className="text-[10px]"><Flag className="mr-1 h-3 w-3" />{batch.priority}</Badge>}
                {batch.reviewer && <Badge variant="outline" className="text-[10px]"><UserCog className="mr-1 h-3 w-3" />{batch.reviewer}</Badge>}
                {batch.recipeId && <Badge variant="secondary" className="text-[10px]">recipe</Badge>}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {examName} · {batch.subject} · {batch.difficulty} · {batch.count} questions · {new Date(batch.createdAt).toLocaleString()}
              </p>
              <Progress value={progress} className="mt-2 h-1.5 max-w-xs" />
            </div>
            <div className="hidden shrink-0 items-center gap-3 sm:flex">
              <MiniStat label="Approved" value={c.approved} tone="text-success" />
              <MiniStat label="Fix" value={c.needsFix} tone="text-warning" />
              <MiniStat label="Rejected" value={c.rejected} tone="text-destructive" />
              <MiniStat label="New" value={c.unreviewed} tone="text-muted-foreground" />
              <MiniStat label="Dup" value={c.duplicates} tone="text-muted-foreground" />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 border-t pt-4">
            {/* mobile stats */}
            <div className="flex flex-wrap gap-2 sm:hidden">
              <MiniStat label="Approved" value={c.approved} tone="text-success" />
              <MiniStat label="Fix" value={c.needsFix} tone="text-warning" />
              <MiniStat label="Rejected" value={c.rejected} tone="text-destructive" />
              <MiniStat label="New" value={c.unreviewed} tone="text-muted-foreground" />
              <MiniStat label="Dup" value={c.duplicates} tone="text-muted-foreground" />
            </div>

            {/* runtime / cost meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {batch.runtimeMs != null && <span>Runtime: <strong className="text-foreground">{batch.runtimeMs} ms</strong></span>}
              {batch.costMock != null && <span>Cost: <strong className="text-foreground">₹{batch.costMock.toFixed(2)}</strong></span>}
              {batch.generatorVersion && <span>Gen: <strong className="text-foreground">{batch.generatorVersion}</strong></span>}
              <span>Seed: <strong className="font-mono text-foreground">{batch.seed}</strong></span>
            </div>

            {/* batch actions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle:</span>
              {validTransitions.length === 0 && <span className="text-xs text-muted-foreground">terminal state</span>}
              {validTransitions.map((to) => (
                <Button key={to} variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => onTransition(to, `Batch → ${to}`)}>
                  <ArrowRight className="mr-1 h-3 w-3" /> {to}
                </Button>
              ))}
              <div className="mx-1 h-4 w-px bg-border" />
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onRetryFailed}>
                <RefreshCw className="mr-1 h-3 w-3" /> Retry Failed
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onDuplicateBatch}>
                <Copy className="mr-1 h-3 w-3" /> Duplicate Batch
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowLogs((s) => !s)}>
                <ScrollText className="mr-1 h-3 w-3" /> {showLogs ? 'Hide Logs' : 'Logs'}
              </Button>
              {canTransitionBatch(batch.status, 'Cancelled') && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => onTransition('Cancelled', 'Batch cancelled')}>
                  <Ban className="mr-1 h-3 w-3" /> Cancel
                </Button>
              )}
            </div>

            {/* priority + reviewer selects */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</Label>
                <Select value={batch.priority ?? 'Normal'} onValueChange={(v) => onChangePriority(v as GeneratedBatch['priority'])}>
                  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{(['Low', 'Normal', 'High'] as const).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Reviewer</Label>
                <Select value={batch.reviewer ?? REVIEWERS[0]} onValueChange={onAssignReviewer}>
                  <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{REVIEWERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {selectedIds.size > 0 && (
                <Button variant="default" size="sm" className="ml-auto h-7 text-xs" onClick={onApproveSelected}>
                  <ListChecks className="mr-1 h-3 w-3" /> Approve Selected ({selectedIds.size}) → Bank
                </Button>
              )}
            </div>

            {/* logs */}
            {showLogs && batch.logs && batch.logs.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-2.5 font-mono text-[11px]">
                {batch.logs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={cn(
                      log.level === 'error' && 'text-destructive',
                      log.level === 'warning' && 'text-warning',
                      log.level === 'info' && 'text-info',
                    )}>[{log.level}]</span>
                    <span className="text-foreground">{log.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* items */}
            <div className="space-y-3">
              {batch.questions.map((q, i) => (
                <QuestionItem
                  key={q.id}
                  index={i}
                  question={q}
                  selected={selectedIds.has(q.id)}
                  onToggleSelected={(checked) => onToggleSelected(q.id, checked)}
                  editDraft={editDraft}
                  showOriginal={showOriginalId === q.id}
                  onStartEdit={() => onStartEdit(q)}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={onSaveEdit}
                  onUpdateEditDraft={onUpdateEditDraft}
                  onToggleOriginal={() => onToggleOriginal(q.id)}
                  onRegenerateStem={() => onRegenerateStem(q)}
                  onRegenerateOptions={() => onRegenerateOptions(q)}
                  onRegenerateExplanation={() => onRegenerateExplanation(q)}
                  onDuplicate={() => onDuplicateItem(q)}
                  onApprove={() => onApprove(q)}
                  onReject={() => onReject(q)}
                  onNeedsFix={() => onNeedsFix(q)}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ----------------------------------------------------------------------------
// QuestionItem
// ----------------------------------------------------------------------------
interface QuestionItemProps {
  index: number;
  question: GeneratedQuestion;
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
  editDraft: EditDraft | null;
  showOriginal: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUpdateEditDraft: (d: EditDraft) => void;
  onToggleOriginal: () => void;
  onRegenerateStem: () => void;
  onRegenerateOptions: () => void;
  onRegenerateExplanation: () => void;
  onDuplicate: () => void;
  onApprove: () => void;
  onReject: () => void;
  onNeedsFix: () => void;
}

function QuestionItem({
  index, question, selected, onToggleSelected, editDraft, showOriginal,
  onStartEdit, onCancelEdit, onSaveEdit, onUpdateEditDraft, onToggleOriginal,
  onRegenerateStem, onRegenerateOptions, onRegenerateExplanation, onDuplicate,
  onApprove, onReject, onNeedsFix,
}: QuestionItemProps) {
  const isEditing = editDraft?.questionId === question.id;
  const hasOriginal = !!(question.originalStem || question.originalOptions || question.originalExplanation);

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Checkbox checked={selected} onCheckedChange={(v) => onToggleSelected(v === true)} />
          <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
          <StatusBadge tone={gqStatusTone(question.status)} dot className="text-[10px]">{question.status}</StatusBadge>
          {question.validationResult && (
            <StatusBadge tone={validationResultTone(question.validationResult)} className="text-[10px]">Valid: {question.validationResult}</StatusBadge>
          )}
          {hasOriginal && <Badge variant="outline" className="text-[10px]">Regenerated</Badge>}
          {question.duplicateOf && <Badge variant="outline" className="text-[10px]">Dup of {question.duplicateOf.slice(-6)}</Badge>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <GatedButton permission="questions.edit" onClick={onStartEdit} variant="outline" size="sm" className="h-7 text-xs" disabled={isEditing}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
          </GatedButton>
        </div>
      </div>

      {/* meta row */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="font-mono">{question.id}</span>
        <span>Seed: <strong className="font-mono text-foreground">{question.seed}</strong></span>
        {question.patternId && <span>Pattern: <strong className="text-foreground">{question.patternId}</strong></span>}
        {question.generatorVersion && <span>Gen: <strong className="text-foreground">{question.generatorVersion}</strong></span>}
        {question.validationScore != null && <span>Score: <strong className="text-foreground">{question.validationScore}</strong></span>}
        {question.reviewer && <span>Reviewer: <strong className="text-foreground">{question.reviewer}</strong></span>}
        {question.questionBankId && <span>Bank ID: <strong className="font-mono text-success">{question.questionBankId}</strong></span>}
      </div>

      {isEditing && editDraft ? (
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-xs">Stem</Label>
            <Textarea value={editDraft.stem} onChange={(e) => onUpdateEditDraft({ ...editDraft, stem: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {editDraft.options.map((o) => (
              <div key={o.id} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-bold">{o.id}</span>
                <Input value={o.text} onChange={(e) => onUpdateEditDraft({ ...editDraft, options: editDraft.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })} className="h-8 text-sm" />
              </div>
            ))}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Correct Option</Label>
            <Select value={editDraft.correctOption} onValueChange={(v) => onUpdateEditDraft({ ...editDraft, correctOption: v })}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{editDraft.options.map((o) => <SelectItem key={o.id} value={o.id}>Option {o.id}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Explanation</Label>
            <Textarea value={editDraft.explanation} onChange={(e) => onUpdateEditDraft({ ...editDraft, explanation: e.target.value })} rows={2} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onSaveEdit}><Save className="mr-1.5 h-3.5 w-3.5" /> Save</Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit}><X className="mr-1.5 h-3.5 w-3.5" /> Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-foreground">{question.stem}</p>
          <div className="mt-2 space-y-1.5">
            {question.options.map((o) => {
              const correct = o.id === question.correctOption;
              return (
                <div key={o.id} className={cn('flex items-center gap-2 rounded-lg border p-2 text-sm', correct ? 'border-success/40 bg-success/10' : 'bg-card')}>
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold', correct ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground')}>{o.id}</span>
                  <span className={cn(correct && 'font-medium text-foreground')}>{o.text}</span>
                  {correct && <CheckCircle2 className="ml-auto h-4 w-4 text-success" />}
                </div>
              );
            })}
          </div>
          <div className="mt-2 rounded-lg border bg-muted/30 p-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><FileText className="h-3.5 w-3.5" /> Explanation</div>
            <p className="text-sm leading-relaxed text-foreground">{question.explanation}</p>
          </div>

          {hasOriginal && showOriginal && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {question.originalStem && (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2.5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Original Stem</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{question.originalStem}</p>
                </div>
              )}
              {question.originalOptions && (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2.5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Original Options</p>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {question.originalOptions.map((o) => <li key={o.id}><span className="font-bold">{o.id}.</span> {o.text}</li>)}
                  </ul>
                </div>
              )}
              {question.originalExplanation && (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2.5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Original Explanation</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{question.originalExplanation}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onRegenerateStem}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Stem</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onRegenerateOptions}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Options</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onRegenerateExplanation}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Explanation</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onDuplicate}><Copy className="mr-1 h-3.5 w-3.5" /> Duplicate</Button>
            {hasOriginal && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onToggleOriginal}>
                <Eye className="mr-1 h-3.5 w-3.5" /> {showOriginal ? 'Hide Original' : 'View Original'}
              </Button>
            )}
            <div className="ml-auto flex flex-wrap gap-1.5">
              <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={onNeedsFix} disabled={question.status === 'Needs Fix'}><AlertTriangle className="mr-1 h-3.5 w-3.5" /> Needs Fix</Button>
              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={onReject} disabled={question.status === 'Rejected'}><XCircle className="mr-1 h-3.5 w-3.5" /> Reject</Button>
              <GatedButton permission="questions.review" onClick={onApprove} variant="default" size="sm" className="h-7 text-xs" disabled={question.status === 'Approved'}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {question.questionBankId ? 'In Bank' : 'Approve → Bank'}
              </GatedButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
