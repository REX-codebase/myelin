import { useAmp } from 'next/amp'
import type { NextPage } from 'next'

export const config = { amp: 'hybrid' }

const Article: NextPage = () => {
  const isAmp = useAmp()
  return (
    <article>
      <h1>Hybrid AMP article</h1>
      {isAmp ? <amp-img src="/hero.jpg" width="800" height="400" layout="responsive" /> : <img src="/hero.jpg" alt="" />}
    </article>
  )
}

export default Article
