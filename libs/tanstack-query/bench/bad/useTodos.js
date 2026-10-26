import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const fetchTodos = async () => {
  const { data } = await axios.get('/api/todos')
  return data
}

export function useTodos() {
  return useQuery(['todos'], fetchTodos, { staleTime: 5000 })
}

export function TodoCount() {
  const { data, status } = useTodos()
  if (status === 'loading') return <span>...</span>
  return <span>{data.length} todos</span>
}
