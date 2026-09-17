import { useState, useEffect } from 'react';
import { getAdminStats } from '../services/api';
import { IGNORE_KEY } from '../services/analytics';
import type { StatsResponse, StatsDay } from '../types/api';
import axios from 'axios';
import Navigation from '../components/Navigation';

const ADMIN_KEY_STORAGE = 'storkpool_admin_key';
const RANGES = [7, 30, 90];

const readStorage = (key: string): string => {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable; key just won't be remembered
  }
};

const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Single-series daily bar chart with hover tooltip
function DailyBars({ title, data, valueKey }: { title: string; data: StatsDay[]; valueKey: keyof Omit<StatsDay, 'date'> }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const width = 720;
  const height = 180;
  const padTop = 16;
  const padBottom = 24;
  const plotHeight = height - padTop - padBottom;
  const max = Math.max(1, ...data.map(d => d[valueKey]));
  const slot = width / data.length;
  const gap = Math.min(2, slot * 0.2);
  const barWidth = Math.max(1, slot - gap);
  const radius = Math.min(4, barWidth / 2);
  const total = data.reduce((sum, d) => sum + d[valueKey], 0);
  const active = hovered !== null ? data[hovered] : null;

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {active ? `${formatDay(active.date)}: ${active[valueKey]}` : `${total} total`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label={`${title}, ${total} total over ${data.length} days`}
        onMouseLeave={() => setHovered(null)}
      >
        <line x1={0} x2={width} y1={padTop} y2={padTop} stroke="var(--border-color)" strokeDasharray="4 4" />
        <text x={0} y={padTop - 4} fontSize={11} fill="var(--text-secondary)">{max}</text>
        <line x1={0} x2={width} y1={padTop + plotHeight} y2={padTop + plotHeight} stroke="var(--border-color)" />
        {data.map((d, i) => {
          const value = d[valueKey];
          const h = (value / max) * plotHeight;
          const x = i * slot + gap / 2;
          const y = padTop + plotHeight - h;
          const r = Math.min(radius, h);
          return (
            <g key={d.date} onMouseEnter={() => setHovered(i)}>
              {/* Full-height hit target, larger than the bar */}
              <rect x={i * slot} y={padTop} width={slot} height={plotHeight} fill="transparent" />
              {value > 0 && (
                <path
                  d={`M${x},${padTop + plotHeight} V${y + r} Q${x},${y} ${x + r},${y} H${x + barWidth - r} Q${x + barWidth},${y} ${x + barWidth},${y + r} V${padTop + plotHeight} Z`}
                  fill="var(--primary-color)"
                  opacity={hovered === null || hovered === i ? 1 : 0.45}
                />
              )}
            </g>
          );
        })}
        <text x={0} y={height - 6} fontSize={11} fill="var(--text-secondary)">{formatDay(data[0].date)}</text>
        <text x={width} y={height - 6} fontSize={11} fill="var(--text-secondary)" textAnchor="end">
          {formatDay(data[data.length - 1].date)}
        </text>
      </svg>
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  if (rows.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>No data yet.</p>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.95rem' }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th
              key={h}
              style={{
                textAlign: i === 0 ? 'left' : 'right',
                padding: '8px 4px',
                borderBottom: '2px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, i) => (
              <td
                key={i}
                style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  padding: '8px 4px',
                  borderBottom: '1px solid var(--border-color)',
                  fontVariantNumeric: 'tabular-nums',
                  wordBreak: 'break-word',
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatsPage() {
  const [adminKey, setAdminKey] = useState<string>(() => readStorage(ADMIN_KEY_STORAGE));
  const [keyInput, setKeyInput] = useState<string>('');
  const [days, setDays] = useState<number>(30);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!adminKey) return;
    setLoading(true);
    setError('');
    getAdminStats(adminKey, days)
      .then(data => {
        setStats(data);
        // Keep the owner's own browsing out of the numbers
        writeStorage(IGNORE_KEY, '1');
      })
      .catch(err => {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          writeStorage(ADMIN_KEY_STORAGE, null);
          setAdminKey('');
          setError('Invalid admin key');
        } else if (axios.isAxiosError(err)) {
          setError(err.response?.data?.detail || 'Failed to load stats');
        } else {
          setError('Failed to load stats');
        }
      })
      .finally(() => setLoading(false));
  }, [adminKey, days]);

  const handleKeySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    writeStorage(ADMIN_KEY_STORAGE, keyInput.trim());
    setAdminKey(keyInput.trim());
    setKeyInput('');
  };

  const signOut = () => {
    writeStorage(ADMIN_KEY_STORAGE, null);
    setAdminKey('');
    setStats(null);
  };

  if (!adminKey) {
    return (
      <>
        <Navigation />
        <div className="container">
          <div className="header">
            <h1>Stats</h1>
          </div>
          <div className="card">
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleKeySubmit}>
              <div className="form-group">
                <label htmlFor="adminKey" className="form-label">Admin Key</label>
                <input
                  type="password"
                  id="adminKey"
                  className="form-input"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="ADMIN_SECRET_KEY from the server .env"
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full">View Stats</button>
            </form>
          </div>
        </div>
      </>
    );
  }

  const tiles: Array<{ label: string; value: string }> = stats
    ? [
        { label: 'Visitors', value: stats.visitors.toLocaleString() },
        { label: 'Pools Created', value: stats.pools_created.toLocaleString() },
        { label: 'Guesses', value: stats.guesses_submitted.toLocaleString() },
        {
          label: 'Guess → New Pool',
          value: stats.viral_rate === null ? '—' : `${(stats.viral_rate * 100).toFixed(1)}%`,
        },
      ]
    : [];

  return (
    <>
      <Navigation />
      <div className="container">
        <div className="header">
          <h1>Stats</h1>
          <p>First-party analytics for StorkPool</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={`btn ${days === r ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px' }}
                aria-pressed={days === r}
              >
                {r} days
              </button>
            ))}
            <button onClick={signOut} className="btn btn-secondary" style={{ padding: '8px 16px', marginLeft: 'auto' }}>
              Forget key
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          {loading && !stats && <p>Loading…</p>}

          {stats && (
            <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  marginBottom: '32px',
                }}
              >
                {tiles.map(t => (
                  <div key={t.label} style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                    <div className="stat-value">{t.value}</div>
                    <div className="stat-label">{t.label}</div>
                  </div>
                ))}
              </div>

              <DailyBars title="Visitors per day" data={stats.daily} valueKey="visitors" />
              <DailyBars title="Pools created per day" data={stats.daily} valueKey="pools" />

              <details style={{ marginBottom: '32px' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Show daily table</summary>
                <SimpleTable
                  headers={['Date', 'Visitors', 'Pools', 'Guesses']}
                  rows={[...stats.daily].reverse().map(d => [formatDay(d.date), d.visitors, d.pools, d.guesses])}
                />
              </details>

              <h3 style={{ marginBottom: '8px' }}>Traffic sources</h3>
              <SimpleTable
                headers={['Source', 'Visitors', 'Pools Created']}
                rows={stats.sources.map(s => [s.source, s.visitors, s.pools_created])}
              />

              <h3 style={{ marginBottom: '8px' }}>What led to pool creation</h3>
              <SimpleTable
                headers={['CTA', 'Clicks', 'Pools Created']}
                rows={Array.from(
                  new Set([...stats.cta_clicks.map(c => c.source), ...stats.creation_sources.map(c => c.source)])
                ).map(source => [
                  source === 'direct' ? 'No CTA (direct)' : source,
                  source === 'direct' ? '—' : stats.cta_clicks.find(c => c.source === source)?.count ?? 0,
                  stats.creation_sources.find(c => c.source === source)?.count ?? 0,
                ])}
              />

              <h3 style={{ marginBottom: '8px' }}>Events</h3>
              <SimpleTable
                headers={['Event', 'Count']}
                rows={[
                  ['Pageviews', stats.pageviews],
                  ...Object.entries(stats.events),
                  ['Pools revealed (database)', stats.pools_revealed],
                ]}
              />

              <h3 style={{ marginBottom: '8px' }}>Top pages</h3>
              <SimpleTable headers={['Path', 'Views']} rows={stats.top_pages.map(p => [p.path, p.views])} />

              <h3 style={{ marginBottom: '8px' }}>Devices</h3>
              <SimpleTable
                headers={['Device', 'Visitors']}
                rows={Object.entries(stats.devices).map(([device, n]) => [device || 'unknown', n])}
              />

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Pools, guesses, and reveals come from the database and are exact. Visitors and events are
                tracked in the browser, exclude bots, and exclude your own visits in this browser.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default StatsPage;
