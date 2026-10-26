import { ImageResponse } from 'next/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  return new ImageResponse(
    <div style={{ fontSize: 64, display: 'flex' }}>{params.slug}</div>,
    size
  )
}
