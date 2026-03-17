'use client'

import { useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface SpotlightCardProps {
  children: React.ReactNode
  className?: string
  innerClassName?: string
  hover?: boolean
}

export function SpotlightCard({
  children,
  className,
  innerClassName,
  hover = false,
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    if (rafRef.current) return

    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) { rafRef.current = null; return }
      const rect = cardRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      cardRef.current.style.setProperty('--mouse-x', `${x}px`)
      cardRef.current.style.setProperty('--mouse-y', `${y}px`)
      rafRef.current = null
    })
  }, [])

  return (
    <div
      className={cn(
        'glass-card-wrapper rounded-3xl p-px backdrop-blur-md transition-transform duration-200',
        hover && 'hover:scale-[1.01]',
        className,
      )}
      style={{
        background: 'var(--glass-outer)',
        boxShadow: 'rgba(107, 33, 168, 0.2) 0px 20px 40px -12px',
      }}
    >
      {/* Inner frosted surface with spotlight glow */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        className={cn(
          'spotlight-card rounded-[inherit] backdrop-blur-md overflow-hidden h-full',
          innerClassName,
        )}
        style={{
          boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.08)',
        }}
      >
        {/* Content sits above glow pseudo-elements (z-index 10) */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  )
}
