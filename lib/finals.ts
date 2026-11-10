export interface FinalMark {
  id: string;
  name: string;
  currentGrade: number | null;
  finalWeight: number | null;
  weightSource: string | null;
  note: string;
}
export interface FinalCourse {
  id: string;
  title: string;
  teacher: string;
  period: string;
  marks: FinalMark[];
}
export interface FinalGradebook {
  courses: FinalCourse[];
  periods: { id: string; name: string }[];
  currentPeriod: string;
}
type Dict = Record<string, unknown>;
const obj = (v: unknown): Dict => v && typeof v === 'object' && !Array.isArray(v) ? v as Dict : {};
const array = (v: unknown): Dict[] => (Array.isArray(v) ? v : v ? [v] : []).map(obj);
const text = (v: unknown) => v == null ? '' : String(v);
export function number(v: unknown): number | null {
  if (v == null || String(v).trim() === '') return null;
  const value = Number(String(v).trim().replace(/%$/, ''));
  return Number.isFinite(value) ? value : null;
}
const field = (o: Dict, key: string) => o[key] ?? o[`_${key[0].toUpperCase()}${key.slice(1)}`];
const finalName = (s: string) => /^(?:(?:semester|comprehensive|course|end.of.(?:term|semester))\s+)?final(?:\s+(?:exam(?:ination)?|assessment))?(?:\s*\d+)?$|^(?:semester|end.of.(?:term|semester))\s+exam(?:ination)?$/i.test(s.trim());

function parseMark(m: Dict, index: number): FinalMark {
  const summary = m.gradeCalculationSummary ?? m.GradeCalculationSummary;
  const categories = array(obj(summary).AssignmentGradeCalc ?? summary).map(c => ({
    name: text(field(c, 'type')),
    weight: number(field(c, 'weight')),
    earned: number(field(c, 'points')),
    possible: number(field(c, 'pointsPossible')),
  }));
  const finals = categories.filter(c => finalName(c.name));
  const rawGrade = number(field(m, 'calculatedScoreRaw'));
  let currentGrade = rawGrade;
  let finalWeight: number | null = null;
  let weightSource: string | null = null;
  let note = 'Your district did not publish an identifiable final-exam weight. Enter the weight from your syllabus.';
  // A category's weight can be points (80/20), not a literal percentage.
  // Normalize against ALL categories, including the still-ungraded final.
  const totalWeight = categories.reduce((sum, c) => sum + (c.weight ?? 0), 0);
  if (finals.length === 1 && categories.every(c => c.weight !== null && c.weight >= 0) && totalWeight > 0) {
    const final = finals[0];
    finalWeight = final.weight! / totalWeight * 100;
    weightSource = `${final.name} · district grade calculation`;
    const graded = categories.filter(c => c !== final && c.possible !== null && c.possible > 0 && c.earned !== null && c.weight! > 0);
    const activeWeight = graded.reduce((sum, c) => sum + c.weight!, 0);
    currentGrade = activeWeight > 0
      ? graded.reduce((sum, c) => sum + c.earned! / c.possible! * 100 * c.weight!, 0) / activeWeight
      : null;
    note = currentGrade === null
      ? 'No graded coursework is available before the final. Enter your current coursework percentage.'
      : 'Coursework is calculated without the final category, so an existing final score is not counted twice.';
  } else if (finals.length > 1) {
    currentGrade = null;
    note = 'Multiple final categories were found. Confirm the combined final weight and your pre-final coursework grade.';
  } else if (finals.some(c => c.possible !== null && c.possible > 0)) {
    currentGrade = null;
    note = 'A final is already graded, but its weight is unavailable. Enter your coursework grade excluding the final and its weight.';
  }
  return {
    id: String(index), name: text(field(m, 'markName') || field(m, 'shortMarkName')) || `Mark ${index + 1}`,
    currentGrade, finalWeight, weightSource, note,
  };
}

export function parseFinalGradebook(raw: unknown): FinalGradebook {
  const root = obj(raw);
  const gb = obj(root.traditionalGradebook ?? root);
  const courses = array(gb.courses ?? obj(gb.Courses).Course).map((c, i) => ({
    id: `${text(field(c, 'courseID') ?? field(c, 'courseId')) || i}-${i}`,
    title: text(field(c, 'title') || field(c, 'courseName')) || `Class ${i + 1}`,
    teacher: text(field(c, 'staff')), period: text(field(c, 'period')),
    marks: array(c.marks ?? obj(c.Marks).Mark).map(parseMark),
  }));
  return {
    courses,
    periods: array(gb.reportingPeriods ?? obj(gb.ReportingPeriods).ReportPeriod).map(p => ({
      id: text(field(p, 'index')), name: text(field(p, 'gradePeriod')),
    })),
    currentPeriod: text(field(obj(gb.reportingPeriod ?? gb.ReportingPeriod), 'index')),
  };
}

export function projectedGrade(current: number, weight: number, score: number): number {
  if (![current, weight, score].every(Number.isFinite) || weight < 0 || weight > 100) throw new Error('Invalid grade inputs');
  return current * (1 - weight / 100) + score * weight / 100;
}
export function requiredScore(current: number, weight: number, target: number): number | null {
  if (!Number.isFinite(target)) throw new Error('Invalid target');
  projectedGrade(current, weight, 0);
  return weight === 0 ? null : (target - current * (1 - weight / 100)) / (weight / 100);
}
