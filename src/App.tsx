import { useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { CasePage } from './components/CasePage'
import { LibraryDashboard } from './components/LibraryDashboard'
import { ProductPage } from './components/ProductPage'
import { Reader } from './components/Reader'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { findCase } from './data/cases'
import { useLibrary } from './data/library'
import { isLegacyPage } from './data/pages'

declare global {
  interface Window {
    FSPShareableApp?: {
      loadPage: (sourceFile: string) => void
      currentPage: () => string
    }
  }
}

function App() {
  const basename =
    import.meta.env.BASE_URL === '/'
      ? undefined
      : import.meta.env.BASE_URL.replace(/\/$/, '')

  return (
    <BrowserRouter basename={basename}>
      <AppRoutes />
    </BrowserRouter>
  )
}

// Below this width the rail is a drawer; above it, a column the top bar can hide.
const drawerQuery = '(max-width: 1120px)'

function AppRoutes() {
  const navigate = useNavigate()
  const location = useLocation()
  const { library } = useLibrary()
  const { findPageByRoute, findPageBySourceFile } = library
  const [railOpen, setRailOpen] = useState(
    () => typeof window === 'undefined' || !window.matchMedia(drawerQuery).matches,
  )

  function closeDrawer() {
    if (window.matchMedia(drawerQuery).matches) setRailOpen(false)
  }

  const currentPage = useMemo(
    () => findPageByRoute(location.pathname),
    [findPageByRoute, location.pathname],
  )

  useEffect(() => {
    if (!currentPage) {
      document.title = 'FSP Case Study Hub'
    }
  }, [currentPage])

  useEffect(() => {
    window.FSPShareableApp = {
      loadPage: (sourceFile: string) => {
        const page = findPageBySourceFile(sourceFile)
        navigate(page?.routePath ?? '/')
      },
      currentPage: () => currentPage?.sourceFile ?? 'home',
    }

    return () => {
      delete window.FSPShareableApp
    }
  }, [currentPage, findPageBySourceFile, navigate])

  return (
    <div className={`app ${railOpen ? 'app--rail-open' : 'app--rail-hidden'}`}>
      <Topbar
        railOpen={railOpen}
        onToggleRail={() => setRailOpen((open) => !open)}
        onNavigate={closeDrawer}
      />
      <Sidebar currentPage={currentPage} onNavigate={closeDrawer} />
      <button
        className="rail-scrim"
        type="button"
        aria-label="Close navigation"
        tabIndex={-1}
        onClick={() => setRailOpen(false)}
      />
      <div className="main">
        <Routes>
          <Route path="/" element={<LibraryDashboard />} />
          <Route path="/cases/:id" element={<CaseRoute />} />
          <Route path="/bundle" element={<PageRoute />} />
          <Route path="/case-studies/:slug" element={<PageRoute />} />
          <Route path="/products/:slug" element={<PageRoute />} />
          <Route path="/campaign/:slug" element={<PageRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

function CaseRoute() {
  const { id } = useParams()
  const { catalogue } = useLibrary()
  const record = findCase(catalogue, id)

  if (!record) {
    return <Navigate to="/" replace />
  }

  return <CasePage key={record.id} record={record} />
}

// Matched on the full route: a legacy page and a generated case can share a slug.
function PageRoute() {
  const location = useLocation()
  const { library } = useLibrary()
  const page = library.findPageByRoute(location.pathname)

  if (!page) {
    return <Navigate to="/" replace />
  }

  if (page.category === 'product') {
    return <ProductPage page={page} />
  }

  if (!isLegacyPage(page)) {
    return <Navigate to="/" replace />
  }

  return <Reader page={page} />
}

export default App
