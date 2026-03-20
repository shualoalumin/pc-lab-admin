import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeViolations(onViolation: (payload: unknown) => void) {
  const callbackRef = useRef(onViolation)
  callbackRef.current = onViolation

  useEffect(() => {
    const channel = supabase
      .channel('violation-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'violation_events' },
        (payload) => {
          callbackRef.current(payload.new)

          if ('Notification' in window && Notification.permission === 'granted') {
            const v = payload.new as { pc_number: number; url: string }
            new Notification('위반 감지!', {
              body: `PC${String(v.pc_number).padStart(2, '0')} - ${v.url}`,
              icon: '/favicon.ico',
            })
          }
        }
      )
      .subscribe()

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => { supabase.removeChannel(channel) }
  }, [])
}
