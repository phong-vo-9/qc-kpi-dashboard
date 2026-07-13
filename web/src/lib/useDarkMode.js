import { useEffect, useState } from 'react'

// Dark-mode hook (ui.md §14): persists the choice to localStorage, applies the
// `dark` class to <html> (Tailwind darkMode:'class'), defaults to OS preference.
const KEY = 'qc-theme'

function initial() {
  const saved = localStorage.getItem(KEY)
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useDarkMode() {
  const [theme, setTheme] = useState(initial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return { theme, toggle, isDark: theme === 'dark' }
}
