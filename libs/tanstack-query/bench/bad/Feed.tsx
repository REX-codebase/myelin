import { useInfiniteQuery } from '@tanstack/react-query'

const fetchFeed = (cursor: number) => fetch(`/api/feed?cursor=${cursor}`).then((r) => r.json())

export function Feed() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 0 }) => fetchFeed(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    suspense: true,
  })

  return (
    <>
      {data?.pages.flatMap((p) => p.items).map((item) => <p key={item.id}>{item.text}</p>)}
      <button onClick={() => fetchNextPage()} disabled={!hasNextPage}>Load more</button>
    </>
  )
}
