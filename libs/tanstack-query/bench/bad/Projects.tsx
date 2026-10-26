import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

const fetchProjects = (page: number) => fetch(`/api/projects?page=${page}`).then((r) => r.json())

export function Projects() {
  const [page, setPage] = useState(0)
  const { data, isInitialLoading, isPreviousData } = useQuery({
    queryKey: ['projects', page],
    queryFn: () => fetchProjects(page),
    keepPreviousData: true,
  })

  if (isInitialLoading) return <p>Loading...</p>
  return (
    <div>
      {data.items.map((p: { id: number; name: string }) => (
        <div key={p.id}>{p.name}</div>
      ))}
      <button onClick={() => setPage((p) => p + 1)} disabled={isPreviousData || !data.hasMore}>
        Next
      </button>
    </div>
  )
}
