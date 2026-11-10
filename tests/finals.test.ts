import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFinalGradebook, projectedGrade, requiredScore, number } from '../lib/finals.ts';
import { districtURL } from '../lib/district.ts';
const category = (type: string, weight: string, points = '0', pointsPossible = '0') => ({type,weight,points,pointsPossible});
const book = (categories: unknown[], grade = '82') => parseFinalGradebook({courses:[{title:'Calculus',marks:[{markName:'Semester 1',calculatedScoreRaw:grade,gradeCalculationSummary:categories}]}]}).courses[0].marks[0];
test('normalizes weights and excludes an ungraded final', () => {
 const mark = book([category('Coursework','8','720','800'),category('Final Exam','2')]);
 assert.equal(mark.finalWeight,20);assert.equal(mark.currentGrade,90);
 assert.equal(projectedGrade(mark.currentGrade!, mark.finalWeight!, 100),92);
 assert.ok(Math.abs(requiredScore(90,20,90)! - 90) < 1e-9);
});
test('does not count a previously graded final twice', () => {
 const mark=book([category('Homework','40','90','100'),category('Tests','40','80','100'),category('Final Exam','20','50','100')]);
 assert.equal(mark.currentGrade,85);assert.equal(projectedGrade(mark.currentGrade!,20,100),88);
});
test('unknown, ambiguous, invalid and project weights are not guessed', () => {
 assert.equal(book([category('Final Project','20'),category('Tests','80')]).finalWeight,null);
 assert.equal(book([category('Final Exam',''),category('Tests','80')]).finalWeight,null);
 assert.equal(book([category('Final Exam','10'),category('Final','10')]).currentGrade,null);
 assert.equal(book([]).finalWeight,null);
 assert.equal(book([category('Final Exam','20'),category('Coursework','80')]).currentGrade,null);
});
test('supports single-object summaries and reporting periods', () => {
 const data=parseFinalGradebook({reportingPeriod:{index:0},reportingPeriods:[{index:0,gradePeriod:'Semester 1'}],courses:{title:'Biology',marks:{markName:'S1',calculatedScoreRaw:'91.2',gradeCalculationSummary:{type:'Exams',weight:'100'}}}});
 assert.equal(data.currentPeriod,'0');assert.equal(data.courses.length,1);assert.equal(data.courses[0].marks[0].currentGrade,91.2);
 assert.equal(parseFinalGradebook({}).courses.length,0);
});
test('handles zero/full weights, impossible goals, and finite inputs', () => {
 assert.equal(projectedGrade(87,0,50),87);assert.equal(requiredScore(87,0,90),null);
 assert.equal(projectedGrade(87,100,50),50);assert.equal(requiredScore(87,100,90),90);
 assert.ok(requiredScore(50,20,90)!>100);assert.ok(requiredScore(100,20,70)!<0);
 assert.throws(()=>projectedGrade(90,-1,80));assert.throws(()=>projectedGrade(NaN,20,80));
 assert.equal(number(''),null);assert.equal(number('90.5%'),90.5);assert.equal(number('90oops'),null);
});
test('rejects non-HTTPS, embedded credentials and local IP district URLs', () => {
 for (const url of ['http://district.edu','https://u:p@district.edu','https://127.0.0.1','https://localhost','https://district.edu:444']) assert.throws(()=>districtURL(url));
 assert.equal(districtURL('https://il-ipsd-psv.edupoint.com/PXP2_Login.aspx').hostname,'il-ipsd-psv.edupoint.com');
});
