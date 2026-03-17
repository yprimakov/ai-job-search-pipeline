'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) { setTheme(stored); applyTheme(stored) }
    else { applyTheme('dark') }
  }, [])

  function applyTheme(t: Theme) {
    const root = document.documentElement
    if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  function cycle() {
    const next: Theme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    applyTheme(next)
  }

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'

  return (
    <button
      onClick={cycle}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground',
        'hover:bg-secondary/60 hover:text-foreground transition-colors duration-150',
        collapsed && 'justify-center px-2',
      )}
      title={`Theme: ${label}`}
    >
      <Icon size={16} />
      {!collapsed && <span className="text-xs">{label}</span>}
    </button>
  )
}
