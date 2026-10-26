import Image from 'next/legacy/image'
import { getProduct } from '@/lib/shop'

export const revalidate = 60

export default async function ProductPage({ params }) {
  const { id } = params
  const product = await getProduct(id)
  return (
    <main>
      <Image src={product.image} alt={product.name} width={600} height={600} layout="responsive" />
      <h1>{product.name}</h1>
    </main>
  )
}
