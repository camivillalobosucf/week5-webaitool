import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatTimestamp(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDateShort(ts) {
  return new Date(ts).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function isToday(ts) {
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const STORAGE = {
  ENTRIES: 'tt_entries',
  ACTIVE: 'tt_active',
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [entries, setEntries] = useState(() => load(STORAGE.ENTRIES, []));
  // activeJob: { jobNumber, startTimestamp } | null
  const [activeJob, setActiveJob] = useState(() => load(STORAGE.ACTIVE, null));
  const [elapsed, setElapsed] = useState(0);
  const [jobInput, setJobInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const intervalRef = useRef(null);

  // Persist entries
  useEffect(() => {
    localStorage.setItem(STORAGE.ENTRIES, JSON.stringify(entries));
  }, [entries]);

  // Persist active job
  useEffect(() => {
    if (activeJob) {
      localStorage.setItem(STORAGE.ACTIVE, JSON.stringify(activeJob));
    } else {
      localStorage.removeItem(STORAGE.ACTIVE);
    }
  }, [activeJob]);

  // Live timer tick
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (activeJob) {
      const tick = () =>
        setElapsed(Math.floor((Date.now() - activeJob.startTimestamp) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [activeJob]);

  // Stop the running job and save an entry.
  function stopActiveJob(notes = '') {
    if (!activeJob) return null;
    const now = Date.now();
    const durationSeconds = Math.floor((now - activeJob.startTimestamp) / 1000);
    const entry = {
      id: crypto.randomUUID(),
      jobNumber: activeJob.jobNumber,
      startTimestamp: activeJob.startTimestamp,
      endTimestamp: now,
      durationSeconds,
      notes: notes.trim(),
    };
    setEntries((prev) => [entry, ...prev]);
    setActiveJob(null);
    return entry;
  }

  function handleStart() {
    const job = jobInput.trim();
    if (!job) return;
    // Auto-stop current timer before switching
    if (activeJob) stopActiveJob(notesInput);
    setActiveJob({ jobNumber: job, startTimestamp: Date.now() });
    setNotesInput('');
  }

  function handleStop() {
    stopActiveJob(notesInput);
    setNotesInput('');
  }

  function handleDelete(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleClearAll() {
    if (window.confirm('Clear all entries? This cannot be undone.')) {
      setEntries([]);
      setActiveJob(null);
      setNotesInput('');
    }
  }

  // ---------------------------------------------------------------------------
  // Derived / memoised data
  // ---------------------------------------------------------------------------

  const todayEntries = useMemo(
    () => entries.filter((e) => isToday(e.startTimestamp)),
    [entries]
  );

  const dailyTotal = useMemo(
    () => todayEntries.reduce((sum, e) => sum + e.durationSeconds, 0),
    [todayEntries]
  );

  const jobTotals = useMemo(() => {
    const map = {};
    todayEntries.forEach((e) => {
      map[e.jobNumber] = (map[e.jobNumber] || 0) + e.durationSeconds;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [todayEntries]);

  const isRunning = !!activeJob;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">Time Tracker</h1>
          <span className="app-date">
            {new Date().toLocaleDateString([], {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </header>

      <main className="app-main">

        {/* ── Control Panel ── */}
        <section className="card control-card">
          <h2 className="card-label">New / Switch Job</h2>

          <div className="field-group">
            <div className="field">
              <label htmlFor="job-input">Job Number *</label>
              <input
                id="job-input"
                type="text"
                value={jobInput}
                onChange={(e) => setJobInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                placeholder="e.g. JOB-1042"
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label htmlFor="notes-input">Notes (optional)</label>
              <input
                id="notes-input"
                type="text"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                placeholder="What are you working on?"
              />
            </div>
          </div>

          <div className="action-row">
            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={!jobInput.trim()}
            >
              {isRunning ? 'Switch Job' : 'Start'}
            </button>
            {isRunning && (
              <button className="btn btn-stop" onClick={handleStop}>
                Stop
              </button>
            )}
          </div>
        </section>

        {/* ── Active Timer Banner ── */}
        {isRunning && (
          <section className="card active-card">
            <span className="active-pill">● Live</span>
            <p className="active-job-number">{activeJob.jobNumber}</p>
            <p className="active-clock">{formatDuration(elapsed)}</p>
            {notesInput && <p className="active-notes">{notesInput}</p>}
          </section>
        )}

        {/* ── Today's Summary ── */}
        {todayEntries.length > 0 && (
          <section className="card summary-card">
            <h2 className="card-label">Today&rsquo;s Summary</h2>

            <div className="summary-total">
              <span>Daily Total</span>
              <span className="mono">{formatDuration(dailyTotal)}</span>
            </div>

            {jobTotals.length > 0 && (
              <div className="summary-jobs">
                {jobTotals.map(([job, secs]) => (
                  <div key={job} className="summary-row">
                    <span className="summary-job-name">{job}</span>
                    <span className="mono">{formatDuration(secs)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Entries Table ── */}
        <section className="card table-card">
          <div className="table-top">
            <h2 className="card-label" style={{ marginBottom: 0 }}>
              Entries
            </h2>
            {entries.length > 0 && (
              <button className="btn btn-ghost-danger" onClick={handleClearAll}>
                Reset / Clear All
              </button>
            )}
          </div>

          {entries.length === 0 ? (
            <p className="empty-msg">
              No entries yet — start a timer above to begin tracking.
            </p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Date</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Duration</th>
                    <th>Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const today = isToday(entry.startTimestamp);
                    return (
                      <tr key={entry.id} className={today ? '' : 'row-old'}>
                        <td className="td-job">{entry.jobNumber}</td>
                        <td className="td-date">
                          {today
                            ? 'Today'
                            : formatDateShort(entry.startTimestamp)}
                        </td>
                        <td className="mono">
                          {formatTimestamp(entry.startTimestamp)}
                        </td>
                        <td className="mono">
                          {formatTimestamp(entry.endTimestamp)}
                        </td>
                        <td className="mono td-dur">
                          {formatDuration(entry.durationSeconds)}
                        </td>
                        <td className="td-notes">{entry.notes || '—'}</td>
                        <td className="td-action">
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(entry.id)}
                            title="Delete entry"
                            aria-label="Delete entry"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
