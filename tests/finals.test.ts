import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFinalGradebook, projectedGrade, requiredScore, number } from '../lib/finals.ts';
import { districtURL } from '../lib/district.ts';
const category = (type: string, weight: string, points = '0', pointsPossible = '0') => ({type,weight,points,pointsPossible});
const book = (categories: unknown[], grade = '82') => parseFinalGradebook({courses:[{title:'Calculus',marks:[{markName:'Semester 1',calculatedScoreRaw:grade,gradeCalculationSummary:categories}]}]}).courses[0].marks[0];
test('uses declared final percentage and the official current grade', () => {
 const mark = book([category('Coursework','80%','720','800'),category('Final Exam','20%')], '90');
 assert.equal(mark.finalWeight,20);assert.equal(mark.currentGrade,90);
 assert.equal(projectedGrade(mark.currentGrade!, mark.finalWeight!, 100),92);
 assert.ok(Math.abs(requiredScore(90,20,90)! - 90) < 1e-9);
});
test('does not count a previously graded final twice', () => {
 const mark=book([category('Homework','40','90','100'),category('Tests','40','80','100'),category('Final Exam','20','50','100')], '78');
 assert.equal(mark.currentGrade,78);assert.equal(mark.courseworkGrade,85);assert.equal(projectedGrade(mark.courseworkGrade!,20,100),88);
});
test('unknown, ambiguous, invalid and project weights are not guessed', () => {
 assert.equal(book([category('Final Project','20'),category('Tests','80')]).finalWeight,null);
 assert.equal(book([category('Final Exam',''),category('Tests','80')]).finalWeight,null);
 assert.equal(book([category('Final Exam','10'),category('Final','10')]).finalWeight,null);
 assert.equal(book([]).finalWeight,null);
 assert.equal(book([category('Final Exam','20'),category('Coursework','80')]).currentGrade,82);
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

test('does not turn a literal 20% final into 16.67% when coursework categories sum to 100%', () => {
 const mark=book([category('Formative','10%','80','100'),category('Summative','90%','90','100'),category('Final Exam','20%')], '87.334');
 assert.equal(mark.finalWeight,20);
 assert.equal(mark.currentGrade,87.334);
 assert.equal(mark.courseworkGrade,87.334);
});
test('does not infer percentage units from ambiguous raw ratios', () => {
 assert.equal(book([category('Work','8'),category('Final Exam','2')]).finalWeight,null);
 assert.equal(book([category('Work','100'),category('Final Exam','20')]).finalWeight,null);
});
test('leaves already-graded finals unprojectable if category model disagrees with the official grade', () => {
 const mark=book([category('Work','80%','80','100'),category('Final Exam','20%','50','100')], '95');
 assert.equal(mark.currentGrade,95);assert.equal(mark.courseworkGrade,null);
});
test('supports XML-style category wrappers and zero official grades', () => {
 const mark=parseFinalGradebook({Gradebook:{Courses:{Course:{_Title:'Math',Marks:{Mark:{_CalculatedScoreRaw:'0',GradeCalculationSummary:{AssignmentGradeCalc:[{_Type:'Work',_Weight:'80%',_Points:'8',_PointsPossible:'10'},{_Type:'Final Exam',_Weight:'20%'}]}}}}}}}).courses[0].marks[0];
 assert.equal(mark.currentGrade,0);assert.equal(mark.finalWeight,20);
});

test('does not validate a 20% final using a contradictory 120-point flat model', () => {
 const mark=book([category('Work','100%','90','100'),category('Final Exam','20%','50','100')], String((90*100+50*20)/120));
 assert.equal(mark.finalWeight,20);assert.equal(mark.courseworkGrade,null);
});

test('excludes district TOTAL summary rows from category calculations', () => {
 const mark=book([category('Coursework','80%','90','100'),category('TOTAL','100%','82','100'),category('Final Exam','20%','50','100')], '82');
 assert.equal(mark.currentGrade,82);assert.equal(mark.finalWeight,20);assert.equal(mark.courseworkGrade,90);
});
test('combines separate reading, writing and speaking finals', () => {
 const mark=book([category('Coursework','80%','90','100'),category('TOTAL','100%'),category('Final Exam - reading+listening','10%'),category('Final Exam - writing','5%'),category('Final Exam - speaking ','5%')], '90');
 assert.equal(mark.finalWeight,20);assert.equal(mark.courseworkGrade,90);assert.equal(projectedGrade(mark.courseworkGrade!,mark.finalWeight!,100),92);
});
test('removes partially graded final components using active category weights', () => {
 const mark=book([category('Coursework','80%','90','100'),category('Final Exam - reading','10%','45','100'),category('Final Exam - writing','10%')], '85');
 assert.equal(mark.currentGrade,85);assert.equal(mark.finalWeight,20);assert.equal(mark.courseworkGrade,90);
});
