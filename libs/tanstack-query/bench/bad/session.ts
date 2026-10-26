import { QueryClient, useQuery } from '@tanstack/react-query'

export const queryClient = new QueryClient()

const fetchSession = () => fetch('/api/session').then((r) => r.json())

export function prefetchSession() {
  return queryClient.prefetchQuery({ queryKey: ['session'], queryFn: fetchSession })
}

export function useSession() {
  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
    refetchInterval: (data, query) => (data?.expiresSoon ? 5000 : false),
  })

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    sessionQuery.remove()
  }

  return { ...sessionQuery, logout }
}
