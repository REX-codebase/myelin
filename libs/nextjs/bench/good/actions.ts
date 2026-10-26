'use server'

import { cacheLife, cacheTag, revalidateTag, updateTag } from 'next/cache'
import { db } from '@/lib/db'

export async function getTodos() {
  'use cache'
  cacheLife('minutes')
  cacheTag('todos')
  return db.todo.findMany()
}

export async function addTodo(formData: FormData) {
  await db.todo.create({ data: { title: String(formData.get('title')) } })
  updateTag('todos')
}

export async function nightlyRefresh() {
  revalidateTag('todo-stats', 'max')
}
