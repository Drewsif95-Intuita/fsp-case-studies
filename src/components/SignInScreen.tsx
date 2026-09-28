import { useState } from 'react'
import logoOnDark from '../assets/fsp-logo-on-dark.png'
import logoOnLight from '../assets/fsp-logo-on-light.png'

type Action = {
  label: string
  run: () => void | Promise<void>
}

type SignInScreenProps = {
  message: string
  action?: Action
}

// Shown until company sign-in succeeds and the catalogue has loaded, or when it cannot.
export function SignInScreen({ message, action }: SignInScreenProps) {
  const [busy, setBusy] = useState(false)

  async function run() {
    if (!action) return
    setBusy(true)
    try {
      await action.run()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="signin">
      <div className="signin__card">
        <span className="wordmark">
          <img className="wordmark__img--on-light" src={logoOnLight} alt="FSP" width={141} height={71} />
          <img className="wordmark__img--on-dark" src={logoOnDark} alt="" width={141} height={71} />
        </span>
        <p className="eyebrow eyebrow--line">Data and AI</p>
        <h1>Case Study Hub</h1>
        <p className="signin__message" role="status">
          {message}
        </p>
        {action ? (
          <button className="signin__button" type="button" onClick={run} disabled={busy}>
            {action.label}
          </button>
        ) : null}
      </div>
    </main>
  )
}
