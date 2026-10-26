import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  const session = cookies().get('session')?.value
  const lang = headers().get('accept-language') ?? 'en'
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ session, lang })
}
