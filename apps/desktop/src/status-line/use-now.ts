import { useEffect, useState } from 'react'

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000
    const initial = setTimeout(() => {
      setNow(new Date())
      const interval = setInterval(() => setNow(new Date()), 60_000)
      return () => clearInterval(interval)
    }, msUntilNextMinute)

    return () => clearTimeout(initial)
  }, [])

  return now
}
