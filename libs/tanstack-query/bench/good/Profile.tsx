import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

type User = { id: string; name: string; email: string }

export function Profile({ userId }: { userId: string }) {
  const { data, status } = useQuery({
    queryKey: ['user', userId],
    queryFn: async (): Promise<User> => {
      const res = await fetch(`/api/users/${userId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    throwOnError: true,
  })

  useEffect(() => {
    if (data) document.title = data.name
  }, [data])

  if (status === 'pending') return <p>Loading profile...</p>
  return <h1>{data?.name}</h1>
}
