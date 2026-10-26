import { noop, QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient()

type Session = { userId: string; expiresSoon: boolean }

const fetchSession = async (): Promise<Session> => {
  const res = await fetch('/api/session')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function prefetchSession() {
  return queryClient.query({ queryKey: ['session'], queryFn: fetchSession }).catch(noop)
}

export function useSession() {
  const client = useQueryClient()
  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
    refetchInterval: (query) => (query.state.data?.expiresSoon ? 5000 : false),
  })

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    client.removeQueries({ queryKey: ['session'] })
  }

  return { ...sessionQuery, logout }
}
