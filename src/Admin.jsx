import { useEffect, useState } from 'react'
import { api } from './lib/api'

export default function Admin() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [jobs, setJobs] = useState([])
  const [movies, setMovies] = useState([])
  const [settings, setSettings] = useState([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [tab, setTab] = useState('overview')

  const refresh = async () => {
    const [nextStats, nextJobs] = await Promise.all([api.stats(), api.jobs()])
    setStats(nextStats)
    setJobs(nextJobs)
    try {
      const [m, s] = await Promise.all([api.adminMovies({ limit: 20 }), api.settings()])
      setMovies(m.items)
      setSettings(s)
    } catch { /* optional panels */ }
  }

  useEffect(() => {
    api.me().then((u) => { setUser(u); return refresh() }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const signIn = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const r = await api.login({ email, password })
      setUser(r.user)
      await refresh()
    } catch (cause) { setError(cause.message) }
  }

  const runSync = async (type = 'trending') => {
    setSyncing(true)
    setError('')
    try { await api.sync(type, 1); await refresh() }
    catch (cause) { setError(cause.message) }
    finally { setSyncing(false) }
  }

  if (loading) return <div className="admin-shell"><div className="admin-loading">Checking administrator session...</div></div>
  if (!user) {
    return (
      <div className="admin-shell">
        <form className="admin-login" onSubmit={signIn}>
          <span className="eyebrow accent">CINEVAULT ADMIN</span>
          <h1>Welcome <em>back.</em></h1>
          <p>Sign in to manage metadata synchronization and catalog publishing.</p>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={12} /></label>
          {error && <div className="admin-error">{error}</div>}
          <button className="primary-button" type="submit">Sign in securely</button>
        </form>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/"><span className="brand-mark">C</span><span>cine<span>vault</span></span></a>
        <div><span className="admin-user">{user.email}</span><button className="text-button" onClick={() => api.logout().then(() => setUser(null))}>Sign out</button></div>
      </header>
      <main className="admin-main">
        <div className="admin-title">
          <div><span className="eyebrow accent">CONTROL ROOM</span><h1>Good evening, <em>admin.</em></h1><p>Keep the Cinevault catalog fresh and reliable.</p></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary-button" onClick={() => runSync('trending')} disabled={syncing}>{syncing ? 'Syncing...' : 'Run TMDB sync'}</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['overview', 'movies', 'jobs', 'settings'].map((t) => (
            <button key={t} className={tab === t ? 'primary-button' : 'ghost-button'} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
        {error && <div className="admin-error">{error}</div>}
        {tab === 'overview' && (
          <div className="stat-grid">
            {[['Movies', stats?.movies ?? '—'], ['Upcoming', stats?.upcoming ?? '—'], ['Failed jobs', stats?.failedJobs ?? '—']].map(([label, value]) => (
              <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>
        )}
        {tab === 'movies' && (
          <section className="jobs-panel">
            <div className="section-heading"><div><span className="eyebrow">CATALOG</span><h2>Movie publishing</h2></div><button className="text-button" onClick={refresh}>Refresh</button></div>
            <div className="job-list">
              {movies.map((m) => (
                <div className="job-row" key={m.id} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                  <span>{m.title}</span>
                  <small>{m.isPublished ? 'Published' : 'Hidden'}</small>
                  <button className="text-button" onClick={() => api.updateMovie(m.id, { isPublished: !m.isPublished }).then(refresh).catch((e) => setError(e.message))}>{m.isPublished ? 'Hide' : 'Publish'}</button>
                  <button className="text-button" onClick={() => api.resyncMovie(m.id).then(refresh).catch((e) => setError(e.message))}>Resync</button>
                </div>
              ))}
            </div>
            {movies.length === 0 && <p className="admin-muted">No movies yet. Run a sync.</p>}
          </section>
        )}
        {tab === 'jobs' && (
          <section className="jobs-panel">
            <div className="section-heading"><div><span className="eyebrow">OPERATIONS</span><h2>Synchronization history</h2></div><button className="text-button" onClick={refresh}>Refresh</button></div>
            {jobs.length ? (
              <div className="job-list">
                {jobs.map((job) => (
                  <div key={String(job.id)}>
                    <div className="job-row"><span>{job.type}</span><b className={`job-${String(job.status).toLowerCase()}`}>{job.status}</b><small>{job.processedCount} records · {new Date(job.createdAt).toLocaleString()}</small></div>
                    {job.errors?.length > 0 && <small className="admin-muted">{job.errors.length} item errors logged</small>}
                    {job.errorMessage && <small className="admin-muted">{job.errorMessage}</small>}
                  </div>
                ))}
              </div>
            ) : <p className="admin-muted">No synchronization jobs have run yet.</p>}
          </section>
        )}
        {tab === 'settings' && (
          <section className="jobs-panel">
            <div className="section-heading"><div><span className="eyebrow">CONFIG</span><h2>Application settings</h2></div></div>
            <div className="job-list">
              {settings.map((s) => (<div className="job-row" key={s.key}><span>{s.key}</span><small>{s.value || '—'}</small></div>))}
            </div>
            {settings.length === 0 && <p className="admin-muted">No settings yet. TMDB and Watchmode status are shown in overview.</p>}
            <p className="admin-muted">API keys are never exposed to the browser. Last success: {stats?.lastSuccessAt ? new Date(stats.lastSuccessAt).toLocaleString() : '—'}</p>
          </section>
        )}
      </main>
    </div>
  )
}
