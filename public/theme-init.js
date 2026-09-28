// Apply a saved theme before the first paint; src/theme.ts writes the same key.
try {
  var theme = localStorage.getItem('fsp-case-hub-theme')
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme
} catch (error) {
  // Storage can be unavailable; the system setting then applies.
}
