import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

// index.html applies a saved choice under the same key before the first paint.
const storageKey = 'fsp-case-hub-theme'
const darkQuery = '(prefers-color-scheme: dark)'

// An explicit choice lives on <html data-theme>; without one the system setting applies,
// which is how the Data Products handbook behaves too.
function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme
  if (chosen === 'light' || chosen === 'dark') return chosen
  return window.matchMedia(darkQuery).matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    const media = window.matchMedia(darkQuery)
    const follow = () => setTheme(currentTheme())
    media.addEventListener('change', follow)
    return () => media.removeEventListener('change', follow)
  }, [])

  const toggle = useCallback(() => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // Storage can be unavailable, in a private window for instance; the choice then
      // lasts until the page is reloaded.
    }
    setTheme(next)
  }, [])

  return { theme, toggle }
}
