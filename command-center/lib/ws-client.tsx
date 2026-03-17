'use client'

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react'

type WSEvent = 'tracker_updated' | 'qa_updated' | 'results_updated' | 'queue_updated'
type Listener = (type: WSEvent) => void

interface WSContextValue {
  subscribe: (fn: Listener) => () => void
}

const WSContext = createContext<WSContextValue>({ subscribe: () => () => {} })

export function WSProvider({ children }: { children: React.ReactNode }) {
  const listeners = useRef<Set<Listener>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${window.location.host}/ws`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type) {
          listeners.current.forEach(fn => fn(data.type as WSEvent))
        }
      } catch {}
    }

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn)
    return () => listeners.current.delete(fn)
  }, [])

  return <WSContext.Provider value={{ subscribe }}>{children}</WSContext.Provider>
}

export function useWS(event: WSEvent, callback: () => void) {
  const { subscribe } = useContext(WSContext)
  useEffect(() => {
    return subscribe((type) => {
      if (type === event) callback()
    })
  }, [subscribe, event, callback])
}
