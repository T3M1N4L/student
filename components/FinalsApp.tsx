'use client';

import { useState } from 'react';
import { ArrowLeft, LogOut, RefreshCw } from 'lucide-react';
import {
  number, projectedGrade, requiredScore,
  type FinalCourse, type FinalGradebook, type FinalMark,
} from '@/lib/finals';

interface Credentials { district_url: string; username: string; password: string }
interface District { name: string; url: string }
const pct = (value: number) => `${Number(value.toFixed(2))}%`;
const initialValue = (value: number | null) => value === null ? '' : String(Number(value.toFixed(4)));

async function loadGrades(credentials: Credentials, reportPeriod?: string): Promise<FinalGradebook> {
  const response = await fetch('/api/finals', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...credentials, ...(reportPeriod ? { reportPeriod } : {}) }),
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load grades.');
  return result;
}

export default function FinalsApp() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [gradebook, setGradebook] = useState<FinalGradebook | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const course = gradebook?.courses.find(c => c.id === selected) ?? gradebook?.courses[0];

  async function refresh(period?: string) {
    if (!credentials) return;
    setBusy(true);
    setError('');
    try { setGradebook(await loadGrades(credentials, period)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not refresh grades.'); }
    finally { setBusy(false); }
  }

  function signOut() {
    setCredentials(null);
    setGradebook(null);
    setSelected('');
    setError('');
  }

  return <main className={`app ${gradebook ? '' : 'signed-out'}`}>
    <header>
      <h1>Finals</h1>
      {gradebook && <div className="actions">
        <button className="icon-button" aria-label="Refresh grades" disabled={busy} onClick={() => refresh(gradebook.currentPeriod)}>
          <RefreshCw size={16} className={busy ? 'spin' : ''} />
        </button>
        <button className="icon-button" aria-label="Sign out" onClick={signOut}><LogOut size={16} /></button>
      </div>}
    </header>
    {!gradebook ? <LoginFlow onLogin={async creds => {
      const data = await loadGrades(creds);
      setCredentials(creds);
      setGradebook(data);
    }} /> : <>
      {error && <p className="error" role="alert">{error}</p>}
      <fieldset disabled={busy} className="selectors" aria-busy={busy}>
        {gradebook.periods.length > 1 && <label>Reporting period
          <select aria-label="Reporting period" value={gradebook.currentPeriod} onChange={e => refresh(e.target.value)}>
            {gradebook.periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>}
        {gradebook.courses.length > 0 && <label>Class
          <select aria-label="Class" value={course?.id} onChange={e => setSelected(e.target.value)}>
            {gradebook.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>}
      </fieldset>
      {course ? <CourseCalculator key={`${gradebook.currentPeriod}-${course.id}-${JSON.stringify(course.marks)}`} course={course} /> : <p className="muted empty">No classes in this reporting period.</p>}
    </>}
  </main>;
}

function LoginFlow({ onLogin }: { onLogin: (creds: Credentials) => Promise<void> }) {
  const [district, setDistrict] = useState<District | null>(null);
  const [searchByZip, setSearchByZip] = useState(false);
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<District[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSearched(false);
    try {
      const res = await fetch(`/api/districts?zip=${encodeURIComponent(query)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setResults(body.districts);
      setSearched(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Search failed.'); }
    finally { setBusy(false); }
  }

  function select(d: District) { setDistrict(d); setError(''); }

  return <section className="login">
    {!district ? <>
      {searchByZip ? <>
        <form onSubmit={search}>
          <label htmlFor="zip">School ZIP code</label>
          <input id="zip" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required value={query} onChange={e => setQuery(e.target.value)} placeholder="60563" />
          <button className="primary" disabled={busy} type="submit">{busy ? 'Searching…' : 'Search districts'}</button>
        </form>
        {results.length > 0 && <div className="district-results">{results.map(d =>
          <button key={d.url} onClick={() => select(d)}>{d.name}</button>,
        )}</div>}
        {searched && !results.length && <p className="muted">No districts found.</p>}
      </> : <form onSubmit={e => {
        e.preventDefault();
        try {
          const u = new URL(url.includes('://') ? url : `https://${url}`);
          if (u.protocol !== 'https:' || !u.hostname.includes('.') || u.username || u.password) throw new Error();
          select({ name: u.hostname, url: u.toString() });
        } catch { setError('Enter a valid HTTPS StudentVUE URL.'); }
      }}>
        <label htmlFor="district-url">District StudentVUE URL</label>
        <input id="district-url" placeholder="https://your-district.edupoint.com" value={url} onChange={e => setUrl(e.target.value)} required />
        <button className="primary" type="submit">Continue</button>
      </form>}
      <button className="text-button switch-method" onClick={() => { setSearchByZip(!searchByZip); setError(''); }}>
        {searchByZip ? 'Use district URL' : 'Search by ZIP code'}
      </button>
    </> : <>
      <div className="district-heading">
        <button className="icon-button" aria-label="Change district" disabled={busy} onClick={() => { setDistrict(null); setPassword(''); setError(''); }}><ArrowLeft size={16} /></button>
        <span title={district.url}>{district.name}</span>
      </div>
      <form onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError('');
        try { await onLogin({ district_url: district.url, username: username.trim(), password }); setPassword(''); }
        catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed.'); }
        finally { setBusy(false); }
      }}>
        <label htmlFor="username">Username</label>
        <input id="username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required disabled={busy} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} />
        <button className="primary" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </>}
    {error && <p role="alert" className="error">{error}</p>}
  </section>;
}

function CourseCalculator({ course }: { course: FinalCourse }) {
  const [markId, setMarkId] = useState(course.marks.at(-1)?.id ?? '');
  const mark = course.marks.find(m => m.id === markId);
  return <>
    {course.marks.length > 1 && <label className="mark-selector">Grade mark
      <select aria-label="Grade mark" value={markId} onChange={e => setMarkId(e.target.value)}>
        {course.marks.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </label>}
    {mark ? <MarkCalculator key={mark.id} mark={mark} /> : <p className="muted empty">No grades available.</p>}
  </>;
}

function MarkCalculator({ mark }: { mark: FinalMark }) {
  const [weight, setWeight] = useState(initialValue(mark.finalWeight));
  const [score, setScore] = useState(85);
  const [target, setTarget] = useState('90');
  const g = mark.courseworkGrade === undefined ? mark.currentGrade : mark.courseworkGrade;
  const w = number(weight), t = number(target);
  const valid = g !== null && g >= 0 && w !== null && w >= 0 && w <= 100;
  const targetValid = t !== null && t >= 0 && t <= 100;
  const result = valid ? projectedGrade(g!, w!, score) : null;
  const needed = valid && targetValid ? requiredScore(g!, w!, t!) : null;
  const auto = mark.finalWeight !== null && w === Number(mark.finalWeight.toFixed(4));
  const message = !valid ? (g === null ? 'No verified pre-final grade available.' : 'Enter a final weight from 0–100%.')
    : !targetValid ? 'Target must be between 0% and 100%.'
    : w === 0 ? (g! >= t! ? 'Target already met. Final has no weight.' : 'Unreachable with a 0% final weight.')
    : needed! > 100 ? 'Requires more than 100% on the final.'
    : needed! <= 0 ? 'Target met even with a 0% final.' : '';

  return <div className="calculator">
    <div className="grade-inputs">
      <div className="current-grade"><span>Current grade</span>
        <output data-testid="current-grade" title="Reported by your district">{mark.currentGrade === null ? '—' : pct(mark.currentGrade)}</output>
      </div>
      <label htmlFor="final-weight">Final weight {auto && <span className="detected" title={mark.weightSource ?? 'Detected from district'}>Auto</span>}
        <div className="percent-input"><input id="final-weight" type="number" min="0" max="100" step="any" placeholder="—" value={weight} onChange={e => setWeight(e.target.value)} /><span>%</span></div>
      </label>
    </div>
    {mark.finalWeight === null && <p className="hint">{mark.note || 'Final weight unavailable. Use your syllabus.'}</p>}
    <section className="scenario">
      <div className="result-row">
        <label htmlFor="exam-score">Final score <strong>{score}%</strong></label>
        <div className="result"><span>Course grade</span><output data-testid="projected-grade" aria-live="polite">{result === null ? '—' : pct(result)}</output></div>
      </div>
      <input aria-label="Final exam score" id="exam-score" className="slider" type="range" min="0" max="100" step="1" value={score} onChange={e => setScore(Number(e.target.value))} disabled={!valid} style={{ '--progress': `${score}%` } as React.CSSProperties} />
      <div className="slider-labels"><span>0%</span><span>100%</span></div>
    </section>
    <section className="target">
      <div className="result-row">
        <label htmlFor="target-grade">Target grade
          <div className="percent-input"><input id="target-grade" type="number" min="0" max="100" step="any" value={target} onChange={e => setTarget(e.target.value)} /><span>%</span></div>
        </label>
        <div className="result"><span>Required on final</span><output data-testid="required-score" aria-live="polite">{!valid || !targetValid ? '—' : w === 0 ? 'No impact' : needed! <= 0 ? '0%' : `${Number((Math.ceil((needed! - 1e-9) * 100) / 100).toFixed(2))}%`}</output></div>
      </div>
      {message && <p className="hint" role="status">{message}</p>}
    </section>
  </div>;
}
