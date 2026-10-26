import { queryOptions, useQuery } from '@tanstack/react-query'

export type Todo = { id: number; title: string }

export const todosQuery = queryOptions({
  queryKey: ['todos'],
  queryFn: async (): Promise<Todo[]> => {
    const res = await fetch('/api/todos')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  staleTime: 5000,
})

export function useTodos() {
  return useQuery(todosQuery)
}

export function TodoCount() {
  const { data, isPending, isError } = useTodos()
  if (isPending) return <span>...</span>
  if (isError) return <span>!</span>
  return <span>{data.length} todos</span>
}
