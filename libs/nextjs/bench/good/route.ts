import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest, ctx: RouteContext<'/api/items/[id]'>) {
  const { id } = await ctx.params
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  const lang = (await headers()).get('accept-language') ?? 'en'
  const q = request.nextUrl.searchParams.get('q')
  if (!session) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  return Response.json({ id, lang, q })
}
