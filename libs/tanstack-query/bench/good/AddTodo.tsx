import { useMutation, useQueryClient } from '@tanstack/react-query'

async function createTodo(title: string) {
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function AddTodo() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })

  return (
    <button disabled={mutation.isPending} onClick={() => mutation.mutate('New todo')}>
      {mutation.isPending ? 'Adding...' : 'Add todo'}
    </button>
  )
}
