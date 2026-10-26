'use server'

import { revalidateTag, unstable_cacheTag as cacheTag, unstable_cacheLife as cacheLife } from 'next/cache'
import { db } from '@/lib/db'

export async function getTodos() {
  'use cache'
  cacheLife('minutes')
  cacheTag('todos')
  return db.todo.findMany()
}

export async function addTodo(formData: FormData) {
  await db.todo.create({ data: { title: String(formData.get('title')) } })
  revalidateTag('todos')
}
