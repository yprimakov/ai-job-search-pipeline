'use client'

export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Orb 1 — top left, slow drift */}
      <div
        className="absolute rounded-full"
        style={{ width: 600, height: 600, top: -200, left: -200, filter: 'blur(80px)', opacity: 0.4 }}
      >
        <div className="orb-1 w-full h-full rounded-full">
          <div className="w-full h-full rounded-full dark:hidden"
            style={{ background: 'linear-gradient(to right bottom, #93c5fd, rgba(186,230,253,0.6))' }} />
          <div className="w-full h-full rounded-full hidden dark:block"
            style={{ background: 'linear-gradient(to right bottom, #a855f7, rgba(99,102,241,0.5))' }} />
        </div>
      </div>

      {/* Orb 2 — bottom right, counter-drift */}
      <div
        className="absolute rounded-full"
        style={{ width: 500, height: 500, bottom: -100, right: -100, filter: 'blur(60px)', opacity: 0.3 }}
      >
        <div className="orb-2 w-full h-full rounded-full">
          <div className="w-full h-full rounded-full dark:hidden"
            style={{ background: 'linear-gradient(to right bottom, rgba(254,214,169,0.8), #fcd34d)' }} />
          <div className="w-full h-full rounded-full hidden dark:block"
            style={{ background: 'linear-gradient(to right bottom, rgba(245,158,11,0.8), #d97706)' }} />
        </div>
      </div>

      {/* Orb 3 — center, gentle pulse */}
      <div
        className="absolute rounded-full"
        style={{
          width: 400, height: 400,
          top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(70px)',
          opacity: 0.22,
        }}
      >
        <div className="orb-3 w-full h-full rounded-full">
          <div className="w-full h-full rounded-full dark:hidden"
            style={{ background: 'linear-gradient(to right bottom, #d8b4fe, #93c5fd)' }} />
          <div className="w-full h-full rounded-full hidden dark:block"
            style={{ background: 'linear-gradient(to right bottom, #6d28d9, #6366f1)' }} />
        </div>
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 96px),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 96px)
          `,
        }}
      />
    </div>
  )
}
