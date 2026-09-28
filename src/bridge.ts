// The /auth/bridge page: hands MSAL's response back to the app's own window, as the Data Products
// handbook's bridge does.
import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge'

broadcastResponseToMainFrame().catch(() => {
  document.body.textContent = 'Sign-in did not complete. Close this window and try again.'
})
