'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Calculator, Check, ChevronRight, GraduationCap, LogOut, Moon, RefreshCw, Search, SlidersHorizontal, Sun } from 'lucide-react';
import { number, projectedGrade, requiredScore, type FinalCourse, type FinalGradebook, type FinalMark } from '@/lib/finals';

interface Credentials { district_url: string; username: string; password: string }
interface District { name: string; url: string; address?: string }
const ipDistrict: District = { name: 'Indian Prairie School District 204', url: 'https://il-ipsd-psv.edupoint.com/', address: 'Illinois · IPSD 204' };
const pct = (n: number) => `${n.toFixed(2).replace(/\.00$/, '')}%`;

async function loadGrades(credentials: Credentials, reportPeriod?: string): Promise<FinalGradebook> {
  const response = await fetch('/api/finals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...credentials, ...(reportPeriod ? { reportPeriod } : {}) }), cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load grades.');
  return result;
}

export default function FinalsApp() {
  const [dark, setDark] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [gradebook, setGradebook] = useState<FinalGradebook | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [districtName, setDistrictName] = useState('');
  const course = gradebook?.courses.find(c => c.id === selected) ?? gradebook?.courses[0];

  async function refresh(period?: string) {
    if (!credentials) return;
    setBusy(true); setError('');
    try { const data = await loadGrades(credentials, period); setGradebook(data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not refresh grades.'); }
    finally { setBusy(false); }
  }
  function signOut() { setCredentials(null); setGradebook(null); setSelected(''); setError(''); }

  return <div className={`app ${dark ? 'dark' : ''}`}>
    <aside className="sidebar">
      <Link className="brand" href="/">student<span>finals</span></Link>
      <p className="nav-label">YOUR WORKSPACE</p>
      <div className="nav-item"><Calculator size={19} /> Final calculator <ChevronRight size={15} /></div>
      <div className="sidebar-note"><GraduationCap size={25} /><h3>A little clarity.<br />A lot less stress.</h3><p>See what’s possible before you sit down for your final.</p></div>
      <div className="sidebar-bottom"><span className="small-icon"><BookOpen size={18} /></span><div><strong>{credentials ? districtName : 'Built for students'}</strong><small>{credentials ? 'Connected to StudentVUE' : 'One exam. A clearer picture.'}</small></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span><Calculator size={18} /> Final calculator</span><div><button className="icon-button" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>{credentials && <button className="quiet-button" onClick={signOut}><LogOut size={16} /> Sign out</button>}</div></header>
      <main>
        {!gradebook ? <LoginFlow onLogin={async (creds, name) => {
          const data = await loadGrades(creds);
          setCredentials(creds); setDistrictName(name); setGradebook(data);
        }} /> : <>
          <div className="page-heading"><div><div className="eyebrow">MAKE YOUR NEXT MOVE</div><h1>Your final, figured out.</h1><p>A little planning goes a long way. Choose a class to explore your outcome.</p></div><button className="secondary-button" disabled={busy} onClick={() => refresh(gradebook.currentPeriod)}><RefreshCw size={16} className={busy ? 'spin' : ''} />{busy ? 'Refreshing…' : 'Refresh grades'}</button></div>
          {error && <div className="error" role="alert">{error}</div>}
          <div className="selection-bar"><label>Reporting period<select disabled={busy} aria-label="Reporting period" value={gradebook.currentPeriod} onChange={e => refresh(e.target.value)}>{gradebook.periods.length ? gradebook.periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">Current reporting period</option>}</select></label><span className="connection"><i /> Grades from your district</span></div>
          {!gradebook.courses.length ? <section className="card empty"><BookOpen size={32} /><h2>No classes available yet.</h2><p>Try a different reporting period or refresh when your district publishes grades.</p></section> : <div className="calculator-layout" aria-busy={busy}>
            <section className="class-panel"><div className="section-label">YOUR CLASSES <span>{gradebook.courses.length}</span></div><label className="mobile-class">Choose a class<select value={course?.id} onChange={e => setSelected(e.target.value)}>{gradebook.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><div className="class-list">{gradebook.courses.map(c => <button className={`class-button ${course?.id === c.id ? 'selected' : ''}`} key={c.id} onClick={() => setSelected(c.id)}><span className="class-icon"><BookOpen size={18} /></span><span><strong>{c.title}</strong><small>{c.period ? `Period ${c.period}` : 'Class'}{c.teacher ? ` · ${c.teacher}` : ''}</small></span><ChevronRight size={15} /></button>)}</div></section>
            {course && <CourseCalculator key={`${gradebook.currentPeriod}-${course.id}-${JSON.stringify(course.marks)}`} course={course} />}
          </div>}
        </>}
        <footer><span>student / finals</span><span>Estimates, not official grades. Your district’s grading and rounding rules apply.</span></footer>
      </main>
    </div>
  </div>;
}

function LoginFlow({ onLogin }: { onLogin: (creds: Credentials, name: string) => Promise<void> }) {
  const [district, setDistrict] = useState<District | null>(null);
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<District[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  async function search(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setSearched(false);
    try {
      const res = await fetch(`/api/districts?zip=${encodeURIComponent(query)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setResults(body.districts); setSearched(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Search failed.'); }
    finally { setBusy(false); }
  }
  function select(d: District) { setDistrict(d); setError(''); }
  return <div className="login-layout">
    <section className="login-intro"><div className="eyebrow"><span className="tiny-star">✳</span> A CLEARER FINISH</div><h1>Less guessing.<br />More <em>knowing.</em></h1><p>Find out what you need on your final.<br />Then make a plan to get there.</p><div className="intro-features"><div><span>01</span><div><strong>Connect your district</strong><small>Bring your classes and grades together.</small></div></div><div><span>02</span><div><strong>Pick your class</strong><small>We’ll look for its final-exam weight.</small></div></div><div><span>03</span><div><strong>Explore what’s possible</strong><small>Set a goal. Slide through the what-ifs.</small></div></div></div><div className="intro-bottom"><SlidersHorizontal size={17} /> One simple tool. Your next step, sorted.</div></section>
    <section className="card login-card"><div className="step-line"><span className={!district ? 'active' : 'done'}>{district ? <Check size={13} /> : '1'}</span><i /><span className={district ? 'active' : ''}>2</span><small>{district ? 'STEP 2 OF 2' : 'STEP 1 OF 2'}</small></div>
      {!district ? <><h2>Find your district.</h2><p>Start with your school’s ZIP code or enter its StudentVUE link.</p><form onSubmit={search}><label htmlFor="zip">School ZIP code</label><div className="search-input"><Search size={17} /><input id="zip" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required placeholder="e.g. 60563" value={query} onChange={e => setQuery(e.target.value)} /><button disabled={busy} type="submit" aria-label="Search districts">{busy ? '…' : <ArrowRight size={19} />}</button></div></form>
        {results.length > 0 && <div className="district-results">{results.map(d => <button key={d.url} onClick={() => select(d)}><span><strong>{d.name}</strong><small>{d.address}</small></span><ChevronRight size={17} /></button>)}</div>}
        {searched && !results.length && <p className="hint">No districts found. Try your district’s StudentVUE URL below.</p>}
        <div className="divider"><span>or use a district link</span></div><form onSubmit={e => { e.preventDefault(); try { const u = new URL(url.includes('://') ? url : `https://${url}`); if (u.protocol !== 'https:' || !u.hostname.includes('.') || u.username || u.password) throw new Error(); select({ name: u.hostname, url: u.toString() }); } catch { setError('Enter a valid HTTPS StudentVUE URL.'); } }}><label htmlFor="district-url">StudentVUE URL</label><input id="district-url" placeholder="https://your-district.edupoint.com" value={url} onChange={e => setUrl(e.target.value)} required /><button className="primary-button full" type="submit">Continue <ArrowRight size={17} /></button></form><button className="suggested-district" onClick={() => select(ipDistrict)}><GraduationCap size={18} /><span><small>QUICK SELECT</small>{ipDistrict.name}</span><ChevronRight size={15} /></button>
      </> : <><button className="back-button" disabled={busy} onClick={() => { setDistrict(null); setPassword(''); setError(''); }}><ArrowLeft size={14} /> Change district</button><h2>Welcome. Let’s connect.</h2><p>Use your StudentVUE student account to load your classes.</p><div className="district-selected"><span className="small-icon"><GraduationCap size={21} /></span><span><strong>{district.name}</strong><small>{district.url}</small></span><Check size={16} /></div><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await onLogin({ district_url: district.url, username: username.trim(), password }, district.name); setPassword(''); } catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed.'); } finally { setBusy(false); } }}><label htmlFor="username">Username</label><input id="username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required disabled={busy} /><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} /><button className="primary-button full" disabled={busy} type="submit">{busy ? 'Loading your classes…' : 'Connect & see my classes'}{!busy && <ArrowRight size={17} />}</button></form><p className="privacy-note">Your login stays in memory for this tab. Refreshing or signing out clears it. No credentials are saved in browser storage.</p></>}
      {error && <div role="alert" className="error">{error}</div>}
    </section>
  </div>;
}

function CourseCalculator({ course }: { course: FinalCourse }) {
  const [markId, setMarkId] = useState(course.marks[0]?.id ?? '');
  const mark = course.marks.find(m => m.id === markId);
  return <section className="course-calculator"><div className="course-heading"><div><span className="eyebrow">LET’S RUN THE NUMBERS</span><h2>{course.title}</h2><p>{course.teacher || 'Your class'}{course.period ? ` · Period ${course.period}` : ''}</p></div>{course.marks.length > 1 && <label>Grade mark<select aria-label="Grade mark" value={markId} onChange={e => setMarkId(e.target.value)}>{course.marks.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}</div>{mark ? <MarkCalculator key={mark.id} mark={mark} /> : <div className="card empty"><h3>No grade marks yet.</h3><p>Try a different reporting period.</p></div>}</section>;
}

function MarkCalculator({ mark }: { mark: FinalMark }) {
  const [current, setCurrent] = useState(mark.currentGrade?.toFixed(4).replace(/0+$/, '').replace(/\.$/, '') ?? '');
  const [weight, setWeight] = useState(mark.finalWeight?.toFixed(4).replace(/0+$/, '').replace(/\.$/, '') ?? '');
  const [score, setScore] = useState(85);
  const [target, setTarget] = useState('90');
  const g = number(current), w = number(weight), t = number(target);
  const valid = g !== null && g >= 0 && w !== null && w >= 0 && w <= 100;
  const result = valid ? projectedGrade(g!, w!, score) : null;
  const needed = valid && t !== null && t >= 0 && t <= 100 ? requiredScore(g!, w!, t) : null;
  const targetValid = t !== null && t >= 0 && t <= 100;
  const auto = mark.finalWeight !== null && w === Number(mark.finalWeight.toFixed(4));
  return <>
    <div className="grade-inputs"><div className="card stat-card"><label htmlFor="current-grade">Coursework grade <small>BEFORE THE FINAL</small></label><div className="percentage-input"><input id="current-grade" type="number" min="0" step="any" placeholder="—" value={current} onChange={e => setCurrent(e.target.value)} /><span>%</span></div><p>{mark.currentGrade === null ? 'Enter your grade excluding the final.' : 'From your district · editable for what-ifs'}</p></div><div className="card stat-card"><label htmlFor="final-weight">Final-exam weight <small className={auto ? 'auto-badge' : ''}>{auto ? '✓ AUTO-DETECTED' : 'MANUAL WEIGHT'}</small></label><div className="percentage-input"><input id="final-weight" type="number" min="0" max="100" step="any" placeholder="—" value={weight} onChange={e => setWeight(e.target.value)} /><span>%</span></div><p>{auto ? mark.weightSource : 'Use the percentage from your syllabus.'}</p></div></div>
    <p className="calculation-note">{mark.note}</p>
    {!valid && <div className="notice" role="status">Enter a coursework grade of 0% or higher and a final weight between 0% and 100% to calculate.</div>}
    <section className="card scenario-card"><div className="card-title"><span className="small-icon purple"><SlidersHorizontal size={20} /></span><div><h3>What if I score…</h3><p>Move the slider. See the bigger picture.</p></div><span className="badge">EXPLORE</span></div><div className="scenario-numbers"><div><label htmlFor="exam-score">On my final</label><div className="score-value">{score}<span>%</span></div></div><ArrowRight className="scenario-arrow" size={27} /><div className="projected"><span>My course grade would be</span><output data-testid="projected-grade" aria-live="polite">{result === null ? '—' : pct(result)}</output></div></div><input aria-label="Final exam score" id="exam-score" className="score-slider" type="range" min="0" max="100" step="1" value={score} onChange={e => setScore(Number(e.target.value))} disabled={!valid} style={{ '--progress': `${score}%` } as React.CSSProperties} /><div className="slider-labels"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div><div className="score-shortcuts"><span>Try a score</span>{[60, 70, 80, 90, 100].map(n => <button disabled={!valid} aria-pressed={score === n} key={n} onClick={() => setScore(n)}>{n}%</button>)}</div>{valid && <div className="range-summary">Your possible range <strong>{pct(projectedGrade(g!, w!, 0))} – {pct(projectedGrade(g!, w!, 100))}</strong></div>}</section>
    <section className="card target-card"><div className="card-title"><span className="small-icon purple"><GraduationCap size={21} /></span><div><h3>What do I need?</h3><p>Work backward from the grade you want.</p></div></div><div className="target-row"><label htmlFor="target-grade">I want a course grade of<div className="target-input"><input id="target-grade" type="number" min="0" max="100" step="any" value={target} onChange={e => setTarget(e.target.value)} /><span>%</span></div></label><div className="needed-score" aria-live="polite"><span>I need on my final</span><strong data-testid="required-score">{!valid || !targetValid ? '—' : w === 0 ? 'No impact' : needed! <= 0 ? '0%' : `${(Math.ceil((needed! - 1e-9) * 100) / 100).toFixed(2)}%`}</strong></div></div><p className={`target-message ${valid && targetValid && needed !== null && needed > 100 ? 'unreachable' : ''}`}>{!targetValid ? 'Enter a target between 0% and 100%.' : !valid ? 'Add your coursework grade and final weight above.' : w === 0 ? (g! >= t! ? 'You already meet this target. The final has no weight.' : 'This target cannot be reached through a final with 0% weight.') : needed! > 100 ? 'Above 100% — this target needs extra credit or a change in your coursework grade.' : needed! <= 0 ? 'You’ll meet this target even with a 0% on the final, assuming your coursework grade stays the same.' : 'You’ve got a number to aim for. Required score is rounded up to the next 0.01%.'}</p></section>
    <div className="formula-note"><Calculator size={15} /><span>Course grade = coursework × (1 − final weight) + final score × final weight.<br />Assumes all remaining coursework is complete and the final is the entire final category.</span></div>
  </>;
}
