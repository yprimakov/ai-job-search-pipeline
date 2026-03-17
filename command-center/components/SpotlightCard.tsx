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
    if (rafRef.current) return // RAF-gated

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
        'glass-card-wrapper relative rounded-3xl p-px backdrop-blur-md transition-transform duration-200',
        hover && 'hover:scale-[1.01]',
        className,
      )}
      style={{
        background: 'var(--glass-outer)',
        boxShadow: 'rgba(107,33,168,0.2) 0px 25px 50px -12px',
      }}
    >
      {/* Animated border lines */}
      <div className="card-border-top" />
      <div className="card-border-bottom" />
      <div className="card-border-left" />
      <div className="card-border-right" />

      {/* Inner frosted surface with spotlight glow */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        className={cn(
          'spotlight-card relative rounded-[inherit] backdrop-blur-md overflow-hidden',
          innerClassName,
        )}
        style={{
          boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.1)',
        }}
      >
        {/* Content sits above glow at z-20 */}
        <div className="relative z-20">
          {children}
        </div>
      </div>
    </div>
  )
}
