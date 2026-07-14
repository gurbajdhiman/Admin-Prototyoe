import { EXAMS, TEST_STATUSES, TEST_TYPES, LANGUAGES, ADMIN_NAMES } from './exams';

export interface Test {
  id: string; name: string; exam: string; examName: string;
  type: string; series: string; access: 'Free' | 'Paid'; language: string;
  totalQuestions: number; durationMin: number; difficulty: string;
  status: string; scheduledDate: string | null; attempts: number; author: string;
}

const TEST_NAMES = ['Full Mock Test 1', 'Full Mock Test 2', 'Full Mock Test 3', 'Full Mock Test 4', 'Sectional Test - Quant', 'Sectional Test - Reasoning', 'Sectional Test - English', 'Sectional Test - GA', 'Previous Year 2023', 'Previous Year 2022', 'Daily Quiz - Morning', 'Daily Quiz - Evening', 'Topic Test - Percentage', 'Topic Test - Coding-Decoding', 'Full Mock Test 5', 'Mini Mock - 30 Questions'];

export const TESTS: Test[] = Array.from({ length: 32 }).map((_, i) => {
  const exam = EXAMS[i % EXAMS.length];
  const status = TEST_STATUSES[i % TEST_STATUSES.length];
  const seriesOpts = ['SSC CGL Prime Series', 'Banking Pro Series', 'Railway Power Pack', 'Punjab Combo Pack', 'Standalone'];
  return {
    id: `T-${(2000 + i).toString()}`, name: `${exam.name} - ${TEST_NAMES[i % TEST_NAMES.length]}`,
    exam: exam.code, examName: exam.name, type: TEST_TYPES[i % TEST_TYPES.length],
    series: seriesOpts[i % seriesOpts.length], access: i % 3 === 0 ? 'Free' : 'Paid',
    language: LANGUAGES[i % LANGUAGES.length], totalQuestions: [25, 50, 75, 100][i % 4],
    durationMin: [20, 40, 60, 90, 120][i % 5], difficulty: ['Easy', 'Moderate', 'Hard', 'Expert'][i % 4],
    status, scheduledDate: status === 'Scheduled' || status === 'Live' || status === 'Completed' ? new Date(Date.now() + (i - 10) * 86400000).toISOString().slice(0, 10) : null,
    attempts: status === 'Completed' || status === 'Live' ? 1200 + (i * 137) % 8000 : (i * 23) % 400,
    author: ADMIN_NAMES[i % ADMIN_NAMES.length],
  };
});

export interface TestSeries {
  id: string; name: string; exam: string; examName: string;
  testsCount: number; freeTests: number; paidTests: number;
  validityDays: number; language: string; enrolments: number;
  completionRate: number; status: 'Active' | 'Archived' | 'Draft';
}

export const TEST_SERIES: TestSeries[] = [
  { id: 'TS-01', name: 'SSC CGL Prime 2025', exam: 'SSC_CGL_T1', examName: 'SSC CGL Tier 1', testsCount: 48, freeTests: 3, paidTests: 45, validityDays: 365, language: 'English + Hindi', enrolments: 12450, completionRate: 68, status: 'Active' },
  { id: 'TS-02', name: 'SSC CHSL Power Pack', exam: 'SSC_CHSL_T1', examName: 'SSC CHSL Tier 1', testsCount: 36, freeTests: 2, paidTests: 34, validityDays: 270, language: 'English + Hindi', enrolments: 8200, completionRate: 61, status: 'Active' },
  { id: 'TS-03', name: 'IBPS PO Prelims Booster', exam: 'IBPS_PO_PRE', examName: 'IBPS PO Prelims', testsCount: 30, freeTests: 2, paidTests: 28, validityDays: 180, language: 'English + Hindi', enrolments: 18900, completionRate: 74, status: 'Active' },
  { id: 'TS-04', name: 'IBPS Clerk Complete', exam: 'IBPS_CLERK_PRE', examName: 'IBPS Clerk Prelims', testsCount: 40, freeTests: 3, paidTests: 37, validityDays: 240, language: 'English + Hindi', enrolments: 15600, completionRate: 71, status: 'Active' },
  { id: 'TS-05', name: 'RRB NTPC CBT 1 Mega Series', exam: 'RRB_NTPC_CBT1', examName: 'RRB NTPC CBT 1', testsCount: 52, freeTests: 4, paidTests: 48, validityDays: 365, language: 'English + Hindi', enrolments: 22300, completionRate: 59, status: 'Active' },
  { id: 'TS-06', name: 'Punjab PSSSB Clerk Combo', exam: 'PUNJAB_PSSSB_CLERK', examName: 'Punjab PSSSB Clerk', testsCount: 24, freeTests: 2, paidTests: 22, validityDays: 180, language: 'English + Punjabi', enrolments: 6800, completionRate: 64, status: 'Active' },
  { id: 'TS-07', name: 'Punjab Excise Inspector Pack', exam: 'PUNJAB_EXCISE_INSP', examName: 'Punjab Excise Inspector', testsCount: 20, freeTests: 1, paidTests: 19, validityDays: 150, language: 'English + Punjabi', enrolments: 3400, completionRate: 52, status: 'Draft' },
  { id: 'TS-08', name: 'SSC MTS Foundation', exam: 'SSC_MTS', examName: 'SSC MTS', testsCount: 28, freeTests: 2, paidTests: 26, validityDays: 210, language: 'English + Hindi', enrolments: 9100, completionRate: 57, status: 'Archived' },
];

export type BlueprintStatus = 'Draft' | 'Active' | 'Deprecated' | 'Archived';

export interface BlueprintSection {
  name: string; subject: string; questions: number; marks: number; duration: number;
  difficultyDistribution?: { Easy: number; Moderate: number; Hard: number };
  topicTargets?: { topic: string; count: number }[];
}

export interface Blueprint {
  id: string; name: string; exam: string; examName: string; stage?: string;
  version: number;
  sections: BlueprintSection[];
  totalQuestions: number; totalMarks: number; durationMin: number;
  negativeMarking: number; languages: string[];
  sectionTiming: 'shared' | 'sectional';
  navigationRules: { switchSections: boolean; markForReview: boolean; preventFullscreenExit: boolean };
  translationRequirements: string[];
  previousYearTarget: number;
  repetitionLimit: number;
  effectiveDate: string;
  status: BlueprintStatus;
  patternVersion: string;
  createdAt: string; updatedAt: string;
}

export const BLUEPRINTS: Blueprint[] = [
  { id: 'BP-01', name: 'SSC CGL Tier 1 (2024 pattern)', exam: 'SSC_CGL_T1', examName: 'SSC CGL Tier 1', stage: 'Tier 1', version: 1, sections: [{ name: 'General Intelligence & Reasoning', subject: 'Reasoning Ability', questions: 25, marks: 50, duration: 0 }, { name: 'General Awareness', subject: 'General Awareness', questions: 25, marks: 50, duration: 0 }, { name: 'Quantitative Aptitude', subject: 'Quantitative Aptitude', questions: 25, marks: 50, duration: 0 }, { name: 'English Comprehension', subject: 'English Language', questions: 25, marks: 50, duration: 0 }], totalQuestions: 100, totalMarks: 200, durationMin: 60, negativeMarking: 0.5, languages: ['English', 'Hindi'], sectionTiming: 'shared', navigationRules: { switchSections: true, markForReview: true, preventFullscreenExit: false }, translationRequirements: ['Hindi'], previousYearTarget: 20, repetitionLimit: 3, effectiveDate: '2024-09-01', status: 'Active', patternVersion: 'v3.0', createdAt: '2024-09-01', updatedAt: '2024-09-01' },
  { id: 'BP-02', name: 'SSC CHSL Tier 1 (2024 pattern)', exam: 'SSC_CHSL_T1', examName: 'SSC CHSL Tier 1', stage: 'Tier 1', version: 1, sections: [{ name: 'English Language', subject: 'English Language', questions: 25, marks: 50, duration: 0 }, { name: 'General Intelligence', subject: 'Reasoning Ability', questions: 25, marks: 50, duration: 0 }, { name: 'Quantitative Aptitude', subject: 'Quantitative Aptitude', questions: 25, marks: 50, duration: 0 }, { name: 'General Awareness', subject: 'General Awareness', questions: 25, marks: 50, duration: 0 }], totalQuestions: 100, totalMarks: 200, durationMin: 60, negativeMarking: 0.5, languages: ['English', 'Hindi'], sectionTiming: 'shared', navigationRules: { switchSections: true, markForReview: true, preventFullscreenExit: false }, translationRequirements: ['Hindi'], previousYearTarget: 15, repetitionLimit: 3, effectiveDate: '2024-07-01', status: 'Active', patternVersion: 'v2.1', createdAt: '2024-07-01', updatedAt: '2024-07-01' },
  { id: 'BP-03', name: 'IBPS PO Prelims', exam: 'IBPS_PO_PRE', examName: 'IBPS PO Prelims', stage: 'Prelims', version: 1, sections: [{ name: 'English Language', subject: 'English Language', questions: 30, marks: 30, duration: 20 }, { name: 'Numerical Ability', subject: 'Quantitative Aptitude', questions: 35, marks: 35, duration: 20 }, { name: 'Reasoning Ability', subject: 'Reasoning Ability', questions: 35, marks: 35, duration: 20 }], totalQuestions: 100, totalMarks: 100, durationMin: 60, negativeMarking: 0.25, languages: ['English', 'Hindi'], sectionTiming: 'sectional', navigationRules: { switchSections: false, markForReview: true, preventFullscreenExit: true }, translationRequirements: ['Hindi'], previousYearTarget: 10, repetitionLimit: 2, effectiveDate: '2024-10-01', status: 'Active', patternVersion: 'v4.0', createdAt: '2024-10-01', updatedAt: '2024-10-01' },
  { id: 'BP-04', name: 'IBPS Clerk Prelims', exam: 'IBPS_CLERK_PRE', examName: 'IBPS Clerk Prelims', stage: 'Prelims', version: 1, sections: [{ name: 'English Language', subject: 'English Language', questions: 30, marks: 30, duration: 20 }, { name: 'Numerical Ability', subject: 'Quantitative Aptitude', questions: 35, marks: 35, duration: 20 }, { name: 'Reasoning Ability', subject: 'Reasoning Ability', questions: 35, marks: 35, duration: 20 }], totalQuestions: 100, totalMarks: 100, durationMin: 60, negativeMarking: 0.25, languages: ['English', 'Hindi'], sectionTiming: 'sectional', navigationRules: { switchSections: false, markForReview: true, preventFullscreenExit: true }, translationRequirements: ['Hindi'], previousYearTarget: 10, repetitionLimit: 2, effectiveDate: '2024-08-01', status: 'Active', patternVersion: 'v3.2', createdAt: '2024-08-01', updatedAt: '2024-08-01' },
  { id: 'BP-05', name: 'RRB NTPC CBT 1', exam: 'RRB_NTPC_CBT1', examName: 'RRB NTPC CBT 1', stage: 'CBT 1', version: 1, sections: [{ name: 'General Awareness', subject: 'General Awareness', questions: 40, marks: 40, duration: 0 }, { name: 'Mathematics', subject: 'Quantitative Aptitude', questions: 30, marks: 30, duration: 0 }, { name: 'General Intelligence & Reasoning', subject: 'Reasoning Ability', questions: 30, marks: 30, duration: 0 }], totalQuestions: 100, totalMarks: 100, durationMin: 90, negativeMarking: 0.33, languages: ['English', 'Hindi'], sectionTiming: 'shared', navigationRules: { switchSections: true, markForReview: true, preventFullscreenExit: false }, translationRequirements: ['Hindi'], previousYearTarget: 25, repetitionLimit: 3, effectiveDate: '2024-06-01', status: 'Active', patternVersion: 'v2.0', createdAt: '2024-06-01', updatedAt: '2024-06-01' },
  { id: 'BP-06', name: 'Punjab PSSSB Clerk', exam: 'PUNJAB_PSSSB_CLERK', examName: 'Punjab PSSSB Clerk', stage: 'Clerk', version: 1, sections: [{ name: 'General Awareness (Punjab)', subject: 'General Awareness', questions: 25, marks: 25, duration: 0 }, { name: 'Punjabi Language', subject: 'Punjabi Language', questions: 15, marks: 15, duration: 0 }, { name: 'English', subject: 'English Language', questions: 10, marks: 10, duration: 0 }, { name: 'Mathematics', subject: 'Quantitative Aptitude', questions: 15, marks: 15, duration: 0 }, { name: 'Reasoning', subject: 'Reasoning Ability', questions: 15, marks: 15, duration: 0 }, { name: 'Computer Knowledge', subject: 'Computer Knowledge', questions: 20, marks: 20, duration: 0 }], totalQuestions: 100, totalMarks: 100, durationMin: 120, negativeMarking: 0, languages: ['English', 'Punjabi'], sectionTiming: 'shared', navigationRules: { switchSections: true, markForReview: true, preventFullscreenExit: false }, translationRequirements: ['Punjabi'], previousYearTarget: 15, repetitionLimit: 2, effectiveDate: '2024-11-01', status: 'Active', patternVersion: 'v1.3', createdAt: '2024-11-01', updatedAt: '2024-11-01' },
];
