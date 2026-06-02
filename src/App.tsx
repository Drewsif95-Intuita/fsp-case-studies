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
import { LibraryDashboard } from './components/LibraryDashboard'
import { ProductPage } from './components/ProductPage'
import { Reader } from './components/Reader'
import { Sidebar } from './components/Sidebar'
import {
  findPageBySlug,
  findPageBySourceFile,
  isLegacyPage,
  pages,
} from './data/pages'

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

function AppRoutes() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1120px)').matches,
  )

  const currentPage = useMemo(() => {
    return pages.find((page) => page.routePath === location.pathname)
  }, [location.pathname])

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
  }, [currentPage, navigate])

  return (
    <div className={`app ${sidebarCollapsed ? 'app--sidebar-collapsed' : ''}`}>
      <Sidebar
        currentPage={currentPage}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <div className="main">
        <Routes>
          <Route path="/" element={<LibraryDashboard />} />
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

function PageRoute() {
  const { slug } = useParams()
  const location = useLocation()
  const page =
    location.pathname === '/bundle'
      ? findPageBySlug('bundle')
      : findPageBySlug(slug)

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
