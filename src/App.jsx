/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import Admin from './Admin'
import { api, hasApi, tmdbPoster } from './lib/api'

const fallbackMovies = [
  { id: 1, slug: 'the-last-horizon-1', tmdbId: 1, title: 'The Last Horizon', year: 2025, runtime: '2h 18m', runtimeMinutes: 138, rating: 8.7, tmdbRating: 8.7, genre: 'Sci-Fi', language: 'English', originalLanguage: 'en', poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', posterPath: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', backdrop: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1800&q=85', description: 'On the edge of a collapsing solar system, a cartographer discovers a map to a world that should not exist.', overview: 'On the edge of a collapsing solar system, a cartographer discovers a map to a world that should not exist.', trailer: 'https://www.youtube.com/embed/5PSNL1qE6VY', trailers: [{ provider: 'YouTube', videoKey: '5PSNL1qE6VY', type: 'Trailer', official: true }] },
  { id: 2, slug: 'kaalidhar-laapata-2', title: 'Kaalidhar Laapata', year: 2024, rating: 8.1, tmdbRating: 8.1, genre: 'Drama', language: 'Hindi', originalLanguage: 'hi', poster: 'https://image.tmdb.org/t/p/w500/8eifdhaGkNxaN12qeXKsj9j8jJ5.jpg', overview: 'A quiet man finds a new way forward.' },
  { id: 3, slug: 'neon-city-3', title: 'Neon City', year: 2025, rating: 8.4, tmdbRating: 8.4, genre: 'Thriller', language: 'English', originalLanguage: 'en', poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', overview: 'A detective follows a signal nobody else can hear.' },
  { id: 4, slug: 'aynabaji-4', title: 'Aynabaji', year: 2016, rating: 8.6, tmdbRating: 8.6, genre: 'Crime', language: 'Bengali', originalLanguage: 'bn', poster: 'https://image.tmdb.org/t/p/w500/vHq3P1s3u7qXx3w3uQ3nD4Z6x9B.jpg', overview: 'A master of disguise takes a job blurring truth and performance.' },
  { id: 5, slug: 'dune-part-two-5', title: 'Dune: Part Two', year: 2024, rating: 8.8, tmdbRating: 8.8, genre: 'Adventure', language: 'English', originalLanguage: 'en', poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', overview: 'Paul Atreides unites with Chani and the Fremen.' },
  { id: 6, slug: 'maharaja-6', title: 'Maharaja', year: 2024, rating: 8.5, tmdbRating: 8.5, genre: 'Action', language: 'Hindi', originalLanguage: 'hi', poster: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', overview: 'A barber seeks justice after a mysterious burglary.' },
  { id: 7, slug: 'praktan-7', title: 'Praktan', year: 2016, rating: 8.0, tmdbRating: 8.0, genre: 'Romance', language: 'Bengali', originalLanguage: 'bn', poster: 'https://image.tmdb.org/t/p/w500/9Kj5J6f8mQvX5M3y2L7p2d8n1Z.jpg', overview: 'Former lovers share a train and memories.' },
  { id: 8, slug: 'the-wild-robot-8', title: 'The Wild Robot', year: 2024, rating: 8.3, tmdbRating: 8.3, genre: 'Animation', language: 'English', originalLanguage: 'en', poster: 'https://image.tmdb.org/t/p/w500/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg', overview: 'A robot becomes guardian of a young gosling.' },
]

const navItems = [
  ['Home', '/'],
  ['Movies', '/movies'],
  ['Hindi', '/language/hindi'],
  ['Bangla', '/language/bengali'],
  ['Hollywood', '/language/english'],
  ['Upcoming', '/upcoming'],
  ['Discover', '/movies'],
]

function getPath() {
  return window.location.pathname + window.location.search
}

function navigateTo(to) {
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}

function Icon({ name, size = 18 }) {
  const paths = {
    search: (<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></>),
    play: (<path d="m9 6 9 6-9 6V6Z" fill="currentColor" stroke="none" />),
    plus: (<><path d="M12 5v14M5 12h14" /></>),
    check: (<path d="m5 12 4 4L19 6" />),
    arrow: (<><path d="M5 12h14M13 6l6 6-6 6" /></>),
    menu: (<><path d="M4 7h16M4 12h16M4 17h16" /></>),
    close: (<><path d="m6 6 12 12M18 6 6 18" /></>),
    star: (<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />),
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function normalizeMovie(m) {
  const year = m.year || (m.releaseDate ? new Date(m.releaseDate).getFullYear() : null)
  const poster = m.poster || tmdbPoster(m.posterPath) || '/favicon.svg'
  const genre = m.genre || m.genres?.[0]?.genre?.name || m.genres?.[0]?.name || 'Movie'
  const rating = m.rating ?? m.tmdbRating ?? null
  const lang = m.language || (m.originalLanguage === 'hi' ? 'Hindi' : m.originalLanguage === 'bn' ? 'Bengali' : m.originalLanguage === 'en' ? 'English' : m.originalLanguage || '')
  const desc = m.description || m.overview || 'Discover more about this title, its cast, story, and release details.'
  return { ...m, year, poster, genre, rating, language: lang, description: desc }
}

function Poster({ movie, onClick }) {
  const m = normalizeMovie(movie)
  return (
    <button className="poster-card" onClick={onClick} aria-label={`View ${m.title}`}>
      <div className="poster-image-wrap">
        <img src={m.poster} alt={`${m.title} poster`} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        <span className="poster-fallback">{m.title}</span>
        {m.rating != null && (<span className="poster-score"><Icon name="star" size={11} /> {m.rating}</span>)}
        <span className="poster-hover"><span><Icon name="play" size={18} /> View details</span></span>
      </div>
      <span className="poster-name">{m.title}</span>
      <span className="poster-meta">{m.year || '—'} <i /> {m.genre}</span>
    </button>
  )
}

function Section({ title, eyebrow, children, action, onAction }) {
  return (
    <section className="catalog-section">
      <div className="section-heading">
        <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>
        {action && (<button className="text-button" onClick={onAction}>View all <Icon name="arrow" size={16} /></button>)}
      </div>
      {children}
    </section>
  )
}

function useRoute() {
  const [route, setRoute] = useState(getPath())
  useEffect(() => {
    const onPop = () => setRoute(getPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return route
}

function App() {
  const route = useRoute()
  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [availability, setAvailability] = useState(null)
  const [availLoading, setAvailLoading] = useState(false)
  const [region, setRegion] = useState('BD')
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cinevault-watchlist') || '[]') } catch { return [] }
  })
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [apiMovies, setApiMovies] = useState(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [page, setPage] = useState(1)

  const url = new URL(window.location.href)
  const path = url.pathname
  const searchParam = url.searchParams.get('q') || ''

  useEffect(() => {
    try { localStorage.setItem('cinevault-watchlist', JSON.stringify(watchlist)) } catch { /* ignore */ }
  }, [watchlist])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2300)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => { setPage(1); setApiMovies(null); setApiError('') }, [route])

  const toggleWatchlist = useCallback((id) => {
    setWatchlist((items) => (items.includes(id) ? items.filter((x) => x !== id) : [...items, id]))
  }, [])

  const openMovie = useCallback((movie) => {
    setSelected(normalizeMovie(movie))
    setAvailability(null)
  }, [])

  useEffect(() => {
    if (!hasApi() || !selected?.slug) return
    let cancelled = false
    setAvailLoading(true)
    api.availability(selected.slug, region)
      .then((data) => { if (!cancelled) setAvailability(data) })
      .catch(() => { if (!cancelled) setAvailability({ confirmed: false, items: [], region }) })
      .finally(() => { if (!cancelled) setAvailLoading(false) })
    return () => { cancelled = true }
  }, [selected, region])

  const trailerUrl = selected?.trailer || (() => {
    const t = selected?.trailers?.find((x) => x.provider === 'YouTube' && x.videoKey)
    return t ? `https://www.youtube.com/embed/${t.videoKey}` : null
  })()

  const filteredFallback = useMemo(() => {
    const q = (searchParam || query).toLowerCase()
    let list = [...fallbackMovies]
    if (path.startsWith('/language/hindi')) list = list.filter((m) => m.originalLanguage === 'hi' || m.language === 'Hindi')
    else if (path.startsWith('/language/bengali')) list = list.filter((m) => m.originalLanguage === 'bn' || m.language === 'Bengali')
    else if (path.startsWith('/language/english')) list = list.filter((m) => m.originalLanguage === 'en' || m.language === 'English')
    else if (path === '/upcoming') list = list.filter((m) => (m.year || 0) >= 2025)
    else if (path === '/top-rated') list = list.filter((m) => (m.rating || 0) >= 8.4)
    if (q) list = list.filter((m) => `${m.title} ${m.genre} ${m.language}`.toLowerCase().includes(q))
    return list.map(normalizeMovie)
  }, [path, searchParam, query])

  useEffect(() => {
    if (!hasApi()) return
    if (!(path === '/movies' || path === '/trending' || path === '/popular' || path === '/upcoming' || path === '/top-rated' || path.startsWith('/language/') || path.startsWith('/genres/') || path === '/search' || path === '/')) return
    let cancelled = false
    setApiLoading(true)
    setApiError('')
    const params = { page, limit: 20 }
    if (path.startsWith('/language/hindi')) params.language = 'hi'
    if (path.startsWith('/language/bengali')) params.language = 'bn'
    if (path.startsWith('/language/english')) params.language = 'en'
    if (path === '/top-rated') params.sort = 'rating'
    if (path === '/upcoming') params.sort = 'release'
    if (path.startsWith('/genres/')) params.genre = decodeURIComponent(path.split('/')[2] || '')
    if (path === '/search' && searchParam) params.search = searchParam
    if ((searchParam || query) && path !== '/search') params.search = searchParam || query
    api.movies(params).then((data) => { if (!cancelled) setApiMovies(data) }).catch((e) => { if (!cancelled) setApiError(e.message) }).finally(() => { if (!cancelled) setApiLoading(false) })
    return () => { cancelled = true }
  }, [path, page, searchParam, query])

  useEffect(() => {
    if (!query) return
    const t = setTimeout(() => navigateTo(`/search?q=${encodeURIComponent(query)}`), 400)
    return () => clearTimeout(t)
  }, [query])

  if (path === '/admin') return <Admin />

  const displayMovies = hasApi() && apiMovies ? apiMovies.items.map(normalizeMovie) : filteredFallback
  const isHome = path === '/'
  const hero = normalizeMovie(fallbackMovies[0])

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" onClick={(e) => { e.preventDefault(); navigateTo('/') }}>
          <span className="brand-mark">C</span><span>cine<span>vault</span></span>
        </a>
        <nav className={menuOpen ? 'main-nav open' : 'main-nav'}>
          {navItems.map(([label, to]) => (
            <button key={to + label} className={path === to ? 'active' : ''} onClick={() => { navigateTo(to); setMenuOpen(false) }}>{label}</button>
          ))}
        </nav>
        <div className="header-actions">
          <label className="search-box">
            <Icon name="search" size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles, people..." aria-label="Search movie catalog" />
          </label>
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </header>

      {path.startsWith('/movie/') ? (
        <MovieDetail slug={decodeURIComponent(path.split('/')[2] || '')} onOpen={openMovie} onWatchlist={toggleWatchlist} watchlist={watchlist} setToast={setToast} />
      ) : path === '/about' ? (
        <LegalPage title="About Cinevault" eyebrow="OUR STORY" body="Cinevault is a movie discovery platform for Hindi, Bengali, Hollywood, and international cinema. We show trailers, cast, ratings, and legal streaming availability. We do not host or distribute full-length films." />
      ) : path === '/privacy' ? (
        <LegalPage title="Privacy Policy" eyebrow="PRIVACY" body="We store minimal account and watchlist data needed to operate the service. Analytics, if enabled, are documented in settings. Contact us to request export or deletion of your data." />
      ) : path === '/terms' ? (
        <LegalPage title="Terms of Use" eyebrow="TERMS" body="Cinevault is for discovery only. Trailers and provider links belong to their respective owners. Do not scrape, redistribute, or misuse metadata. Provider availability is regional and time-sensitive." />
      ) : path === '/watchlist' ? (
        <main className="search-page">
          <div className="page-intro"><span className="eyebrow">SAVED</span><h1>Your <em>watchlist.</em></h1><p>{watchlist.length} titles saved on this device.</p></div>
          <div className="poster-grid">
            {fallbackMovies.filter((m) => watchlist.includes(m.id)).map((m) => (<Poster key={m.id} movie={m} onClick={() => openMovie(m)} />))}
          </div>
          {watchlist.length === 0 && (<div className="empty-state"><h2>No saved titles yet</h2><p>Tap watchlist on any title to keep it here.</p></div>)}
        </main>
      ) : isHome ? (
        <>
          <section className="hero" style={{ '--backdrop': `url(${hero.backdrop})` }}>
            <div className="hero-content">
              <span className="eyebrow accent">CINEVAULT ORIGINAL</span>
              <h1>The Last<br /><em>Horizon</em></h1>
              <div className="hero-facts"><span className="rating"><Icon name="star" size={14} /> 8.7</span><span>2025</span><span>2h 18m</span><span className="tag">Sci-Fi</span></div>
              <p>{hero.description}</p>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => openMovie(hero)}><Icon name="play" size={16} /> Watch trailer</button>
                <button className="ghost-button" onClick={() => { toggleWatchlist(1); setToast('Watchlist updated') }}>
                  <Icon name={watchlist.includes(1) ? 'check' : 'plus'} size={16} /> {watchlist.includes(1) ? 'In watchlist' : 'Add to watchlist'}
                </button>
              </div>
            </div>
            <div className="hero-dots"><span className="selected" /><span /><span /><span /></div>
          </section>
          <main className="home-content">
            <Section title="Trending this week" eyebrow="WHAT'S HOT" action onAction={() => navigateTo('/trending')}>
              <div className="poster-row">{displayMovies.slice(0, 6).map((m) => (<Poster key={m.id || m.slug} movie={m} onClick={() => (m.slug ? navigateTo(`/movie/${m.slug}`) : openMovie(m))} />))}</div>
            </Section>
            <section className="editorial-banner">
              <div>
                <span className="eyebrow accent">CURATED FOR YOU</span>
                <h2>Stories that stay<br /><em>with you.</em></h2>
                <p>From first frames to final credits, discover films worth making time for.</p>
                <button className="text-button light" onClick={() => navigateTo('/movies')}>Explore the collection <Icon name="arrow" size={16} /></button>
              </div>
              <div className="editorial-art"><div className="art-copy">FRAME<br /><small>NO. 004</small></div></div>
            </section>
            <Section title="Critically acclaimed" eyebrow="THE ESSENTIALS">
              <div className="poster-row">{[...displayMovies].reverse().map((m, i) => (<Poster key={`${m.id || m.slug}-${i}`} movie={m} onClick={() => (m.slug ? navigateTo(`/movie/${m.slug}`) : openMovie(m))} />))}</div>
            </Section>
            {apiError && (<p className="admin-muted">API unavailable, showing local catalog: {apiError}</p>)}
          </main>
        </>
      ) : (
        <main className="search-page">
          <div className="page-intro">
            <span className="eyebrow">{path === '/search' ? 'CATALOG SEARCH' : 'THE COLLECTION'}</span>
            <h1>{pageTitle(path, searchParam)}</h1>
            <p>{apiLoading ? 'Loading titles...' : `${hasApi() && apiMovies ? apiMovies.total : displayMovies.length} titles`}{hasApi() ? ' · live API' : ' · local catalog'}</p>
          </div>
          {apiError && (<div className="admin-error">API error: {apiError}. Showing local catalog.</div>)}
          {displayMovies.length ? (
            <div className="poster-grid">{displayMovies.map((m) => (<Poster key={m.id || m.slug} movie={m} onClick={() => (m.slug && hasApi() ? navigateTo(`/movie/${m.slug}`) : openMovie(m))} />))}</div>
          ) : apiLoading ? (<div className="empty-state"><h2>Loading...</h2></div>) : (
            <div className="empty-state"><h2>No titles found</h2><p>Try a different title, genre, or language.</p></div>
          )}
          {hasApi() && apiMovies && apiMovies.pages > 1 && (
            <div className="hero-actions" style={{ marginTop: 32 }}>
              <button className="ghost-button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
              <span className="admin-muted">Page {apiMovies.page} of {apiMovies.pages}</span>
              <button className="ghost-button" disabled={page >= apiMovies.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </main>
      )}

      <footer className="site-footer" style={{ borderTop: '1px solid #282c38', padding: '45px 5.5vw 25px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: 30, maxWidth: 1400, margin: 'auto' }}>
        <div><a className="brand" href="/" onClick={(e) => { e.preventDefault(); navigateTo('/') }}><span className="brand-mark">C</span><span>cine<span>vault</span></span></a><p style={{ color: '#6f7787', fontSize: 10, lineHeight: 1.7, marginTop: 17 }}>Thoughtfully made for people<br />who love movies.</p></div>
        <div><span className="footer-label" style={{ display: 'block', color: '#e5e5e8', fontSize: 10, marginBottom: 16 }}>Explore</span><button className="text-button" onClick={() => navigateTo('/movies')}>All movies</button><br /><button className="text-button" onClick={() => navigateTo('/upcoming')}>Coming soon</button><br /><button className="text-button" onClick={() => navigateTo('/watchlist')}>Watchlist</button></div>
        <div><span className="footer-label" style={{ display: 'block', color: '#e5e5e8', fontSize: 10, marginBottom: 16 }}>Cinevault</span><button className="text-button" onClick={() => navigateTo('/about')}>About</button><br /><button className="text-button" onClick={() => navigateTo('/privacy')}>Privacy</button><br /><button className="text-button" onClick={() => navigateTo('/terms')}>Terms</button></div>
        <div><span className="footer-label" style={{ display: 'block', color: '#e5e5e8', fontSize: 10, marginBottom: 16 }}>A note on data</span><p style={{ color: '#6f7787', fontSize: 10, lineHeight: 1.7 }}>Movie metadata courtesy of TMDB.<br />This product uses the TMDB API but is not endorsed or certified by TMDB.</p></div>
      </footer>

      {selected && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="movie-modal" role="dialog" aria-modal="true" aria-label={selected.title}>
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close"><Icon name="close" /></button>
            <div className="modal-art" style={{ backgroundImage: `url(${selected.backdrop || selected.poster})` }} />
            <div className="modal-body">
              <span className="eyebrow accent">{(selected.language || '').toUpperCase()} · {(selected.genre || '').toUpperCase()}</span>
              <h2>{selected.title}</h2>
              <div className="hero-facts"><span className="rating"><Icon name="star" size={14} /> {selected.rating ?? '—'}</span><span>{selected.year || '—'}</span><span>{selected.runtime || selected.runtimeMinutes || ''}</span></div>
              <p>{selected.description}</p>
              {trailerUrl ? (
                <button className="primary-button" onClick={() => window.open(trailerUrl, '_blank', 'noopener,noreferrer')}><Icon name="play" size={15} /> View trailer</button>
              ) : (<span className="trailer-unavailable">Trailer not available</span>)}
              <div style={{ marginTop: 16 }}>
                <label className="region-picker">Check region <select value={region} onChange={(e) => setRegion(e.target.value)}><option value="BD">Bangladesh (BD)</option><option value="IN">India (IN)</option><option value="US">United States (US)</option><option value="GB">United Kingdom (GB)</option><option value="CA">Canada (CA)</option><option value="AU">Australia (AU)</option></select></label>
                {availLoading ? (<span className="admin-muted">Checking regional availability...</span>) : availability ? (
                  availability.confirmed && availability.items?.length ? (
                    <div className="provider-links"><span className="admin-muted">Official options ({availability.region})</span><div>{availability.items.slice(0, 5).map((provider, index) => (<a className="provider-link" key={`${provider.name}-${provider.type}-${index}`} href={provider.web_url} target="_blank" rel="noopener noreferrer">Watch on {provider.name} <small>{provider.type}</small></a>))}</div></div>
                  ) : (<span className="admin-muted">No confirmed provider listing for {availability.region || region}.</span>)
                ) : hasApi() ? (<span className="admin-muted">Availability loads for API titles.</span>) : null}
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && (<div className="toast"><Icon name="check" size={15} /> {toast}</div>)}
    </div>
  )
}

function pageTitle(path, q) {
  if (path === '/search') return (<>Results for <em>“{q}”</em></>)
  if (path === '/movies') return (<>All <em>movies.</em></>)
  if (path === '/trending') return (<>Trending <em>now.</em></>)
  if (path === '/popular') return (<>Popular <em>titles.</em></>)
  if (path === '/upcoming') return (<>Coming <em>soon.</em></>)
  if (path === '/top-rated') return (<>Top <em>rated.</em></>)
  if (path === '/language/hindi') return (<>Hindi <em>cinema.</em></>)
  if (path === '/language/bengali') return (<>Bangla <em>cinema.</em></>)
  if (path === '/language/english') return (<>Hollywood <em>& beyond.</em></>)
  if (path.startsWith('/genres/')) return (<>{decodeURIComponent(path.split('/')[2] || 'Genre')} <em>films.</em></>)
  return (<>Discover <em>stories.</em></>)
}

function LegalPage({ title, eyebrow, body }) {
  return (
    <main className="search-page">
      <div className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{body}</p></div>
    </main>
  )
}

function MovieDetail({ slug, onOpen, onWatchlist, watchlist, setToast }) {
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(hasApi())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hasApi()) {
      const found = fallbackMovies.find((m) => m.slug === slug)
      setMovie(found ? normalizeMovie(found) : null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    api.movie(slug).then((data) => { if (!cancelled) setMovie(normalizeMovie({ ...data, poster: tmdbPoster(data.posterPath), backdrop: tmdbPoster(data.backdropPath, 'original'), year: data.releaseDate ? new Date(data.releaseDate).getFullYear() : null, rating: data.tmdbRating, language: data.originalLanguage, description: data.overview })) }).catch((e) => { if (!cancelled) setError(e.message) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  if (loading) return (<main className="search-page"><div className="empty-state"><h2>Loading...</h2></div></main>)
  if (error || !movie) return (<main className="search-page"><div className="empty-state"><h2>Title not found</h2><p>{error || 'This title is unavailable.'}</p><button className="text-button" onClick={() => navigateTo('/movies')}>Browse all titles</button></div></main>)

  return (
    <main className="search-page">
      <div className="page-intro"><span className="eyebrow">{movie.genre} · {movie.language}</span><h1>{movie.title}</h1><p>{movie.description}</p></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="primary-button" onClick={() => onOpen(movie)}><Icon name="play" size={15} /> Details & trailer</button>
        <button className="ghost-button" onClick={() => { onWatchlist(movie.id); setToast('Watchlist updated') }}>{watchlist.includes(movie.id) ? 'Saved' : 'Watchlist'}</button>
      </div>
    </main>
  )
}

export default App
