import { useMutation, useQueryClient } from '@tanstack/react-query'

async function createTodo(title: string) {
  const res = await fetch('/api/todos', { method: 'POST', body: JSON.stringify({ title }) })
  return res.json()
}

export function AddTodo() {
  const queryClient = useQueryClient()
  const mutation = useMutation(createTodo, {
    onSuccess: () => {
      queryClient.invalidateQueries(['todos'])
    },
  })

  return (
    <button disabled={mutation.isLoading} onClick={() => mutation.mutate('New todo')}>
      Add todo
    </button>
  )
}
