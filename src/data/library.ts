import { createContext, useContext } from 'react'
import type { Session } from '../session'
import type { CaseCatalogue } from './cases'
import type { Library } from './pages'

export type LibraryValue = {
  catalogue: CaseCatalogue
  library: Library
  session: Session
}

// Filled once sign-in succeeds and the catalogue has loaded; nothing renders the app before that.
export const LibraryContext = createContext<LibraryValue | null>(null)

export function useLibrary() {
  const value = useContext(LibraryContext)
  if (!value) throw new Error('useLibrary is only available inside the loaded app')
  return value
}
