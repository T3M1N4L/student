export interface FinalMark {
  id: string;
  name: string;
  currentGrade: number | null;
  courseworkGrade?: number | null;
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
const finalName = (s: string) => /^(?:(?:semester|comprehensive|course|end.of.(?:term|semester))\s+)?final(?:\s+(?:exam(?:ination)?|assessment))?(?:\s*\d+)?$|^(?:semester|end.of.(?:term|semester))\s+exam(?:ination)?$/i.test(s.trim().split(/\s+[-–—:]\s*/)[0]);

interface Category {
  name: string;
  weight: number | null;
  percent: boolean;
  earned: number | null;
  possible: number | null;
}

function weightedGrade(categories: Category[]): number | null {
  const graded = categories.filter(c => c.earned !== null && c.possible !== null && c.possible > 0 && c.weight !== null && c.weight > 0);
  const total = graded.reduce((sum, c) => sum + c.weight!, 0);
  return total > 0 ? graded.reduce((sum, c) => sum + c.earned! / c.possible! * c.weight!, 0) / total * 100 : null;
}

function parseMark(m: Dict, index: number): FinalMark {
  const summary = m.gradeCalculationSummary ?? m.GradeCalculationSummary;
  const categories: Category[] = array(obj(summary).assignmentGradeCalc ?? obj(summary).AssignmentGradeCalc ?? summary).map(c => {
    const weight = field(c, 'weight');
    return {
      name: text(field(c, 'type')),
      weight: number(weight), percent: /%\s*$/.test(text(weight)),
      earned: number(field(c, 'points')),
      possible: number(field(c, 'pointsPossible') ?? field(c, 'pointPossible')),
    };
  }).filter(c => !/^(?:grand\s+)?total(?:\s+(?:points|grade))?$/i.test(c.name.trim()));
  const finals = categories.filter(c => finalName(c.name));
  // Preserve the district's reported mark, including zero and extra credit.
  // Category totals are only a fallback when no numerical mark is provided.
  const currentGrade = number(field(m, 'calculatedScoreRaw')) ?? weightedGrade(categories);
  let courseworkGrade = currentGrade;
  let finalWeight: number | null = null;
  let weightSource: string | null = null;
  let note = 'Final weight unavailable. Use your syllabus.';
  if (finals.length > 0) {
    const others = categories.filter(c => !finals.includes(c));
    const complete = categories.every(c => c.weight !== null && c.weight >= 0);
    const total = categories.reduce((sum, c) => sum + (c.weight ?? 0), 0);
    const finalTotal = finals.reduce((sum, c) => sum + (c.weight ?? 0), 0);
    const uniqueFinals = new Set(finals.map(c => c.name.trim().toLowerCase())).size === finals.length;
    if (uniqueFinals && finalTotal >= 0 && finalTotal <= 100 && finals.every(c => c.weight !== null && c.weight >= 0)) {
      if (finals.every(c => c.percent) || (complete && Math.abs(total - 100) < 0.01)) {
        finalWeight = finalTotal;
        weightSource = finals.map(c => `${c.name.trim()}: ${pctWeight(c.weight!)}`).join(' + ');
      }
    }
    const gradedFinals = finals.filter(c => c.possible !== null && c.possible > 0 && c.earned !== null);
    if (finalWeight !== null) {
      if (gradedFinals.length) {
        const modeled = weightedGrade(categories);
        const agrees = complete && Math.abs(total - 100) < 0.01 && modeled !== null && currentGrade !== null && Math.abs(modeled - currentGrade) < 0.11;
        const gradedOthers = others.filter(c => c.earned !== null && c.possible !== null && c.possible > 0 && c.weight !== null && c.weight > 0);
        const courseworkWeight = gradedOthers.reduce((sum, c) => sum + c.weight!, 0);
        const activeFinalWeight = gradedFinals.reduce((sum, c) => sum + c.weight!, 0);
        const contribution = gradedFinals.reduce((sum, c) => sum + c.earned! / c.possible! * 100 * c.weight!, 0);
        // Use the active (not future/ungraded) category denominator, including
        // partially graded split finals. Preserve the official mark's precision.
        courseworkGrade = agrees && courseworkWeight > 0
          ? (currentGrade! * (courseworkWeight + activeFinalWeight) - contribution) / courseworkWeight
          : finalWeight === 100 && agrees ? 0 : null;
        note = courseworkGrade === null
          ? 'The existing final weighting could not be verified.'
          : 'Existing final components are replaced with the selected exam score.';
      } else note = 'Current grade is reported by your district.';
    } else if (gradedFinals.length) {
      courseworkGrade = null;
      note = 'A final is already graded, but its weight is unavailable.';
    }
  }

  return {
    id: String(index), name: text(field(m, 'markName') || field(m, 'shortMarkName')) || `Mark ${index + 1}`,
    currentGrade, courseworkGrade, finalWeight, weightSource, note,
  };
}
const pctWeight = (weight: number) => `${Number(weight.toFixed(4))}%`;

export function parseFinalGradebook(raw: unknown): FinalGradebook {
  const root = obj(raw);
  const data = obj(root.data ?? root);
  const gb = obj(data.traditionalGradebook ?? data.Gradebook ?? data);
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
