import { infiniteQueryOptions, useSuspenseInfiniteQuery } from '@tanstack/react-query'

type FeedPage = { items: { id: string; text: string }[]; nextCursor: number | null }

const feedQuery = infiniteQueryOptions({
  queryKey: ['feed'],
  queryFn: async ({ pageParam }): Promise<FeedPage> => {
    const res = await fetch(`/api/feed?cursor=${pageParam}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})

export function Feed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(feedQuery)

  return (
    <>
      {data.pages.flatMap((p) => p.items).map((item) => (
        <p key={item.id}>{item.text}</p>
      ))}
      <button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
        Load more
      </button>
    </>
  )
}
