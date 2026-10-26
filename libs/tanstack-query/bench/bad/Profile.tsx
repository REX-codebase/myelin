import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

type User = { id: string; name: string; email: string }

export function Profile({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery<User>({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then((r) => r.json()),
    useErrorBoundary: true,
    onSuccess: (user) => {
      document.title = user.name
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) return <p>Loading profile...</p>
  return <h1>{data?.name}</h1>
}
