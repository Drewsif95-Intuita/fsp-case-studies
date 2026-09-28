import { Moon, PanelLeft, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import logoOnDark from '../assets/fsp-logo-on-dark.png'
import logoOnLight from '../assets/fsp-logo-on-light.png'
import { useLibrary } from '../data/library'
import { useTheme } from '../theme'

type TopbarProps = {
  railOpen: boolean
  onToggleRail: () => void
  onNavigate: () => void
}

export function Topbar({ railOpen, onToggleRail, onNavigate }: TopbarProps) {
  const { theme, toggle } = useTheme()
  const { catalogue, session } = useLibrary()
  const dark = theme === 'dark'

  return (
    <header className="topbar">
      <button
        className="icon-button"
        type="button"
        onClick={onToggleRail}
        aria-controls="site-rail"
        aria-expanded={railOpen}
        aria-label={railOpen ? 'Hide navigation' : 'Show navigation'}
        title={railOpen ? 'Hide navigation' : 'Show navigation'}
      >
        <PanelLeft size={17} aria-hidden="true" />
      </button>

      {/* The official FSP artwork from the case-study templates, used unchanged: dark ink on
          light surfaces and the white version on dark ones. */}
      <Link className="wordmark" to="/" aria-label="FSP Case Study Hub home" onClick={onNavigate}>
        <img className="wordmark__img--on-light" src={logoOnLight} alt="" width={141} height={71} />
        <img className="wordmark__img--on-dark" src={logoOnDark} alt="" width={141} height={71} />
      </Link>
      <span className="topbar__divider" aria-hidden="true" />
      <div className="topbar__title">
        <strong>Case Study Hub</strong>
        <span>Data and AI</span>
      </div>

      <div className="topbar__end">
        <span className="topbar__status">
          {catalogue.mode === 'hosted' ? 'FSP internal' : 'Local preview'}
        </span>
        {session.userName ? <span className="topbar__user">{session.userName}</span> : null}
        <button
          className="icon-button"
          type="button"
          onClick={toggle}
          aria-pressed={dark}
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
        </button>
      </div>
    </header>
  )
}
