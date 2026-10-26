'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')
  return (
    <nav className="navbar">
      <Link href="/" className={pathname === '/' ? 'active' : ''}>
        Home
      </Link>
      <Link href={ref ? `/about?ref=${ref}` : '/about'}>About</Link>
    </nav>
  )
}
