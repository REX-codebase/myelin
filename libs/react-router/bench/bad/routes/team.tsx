import { json, defer } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { Await, useLoaderData } from '@remix-run/react';
import { Suspense } from 'react';
import { getTeam, getTeamStats } from '~/models/team.server';

export async function loader({ params }: LoaderFunctionArgs) {
  const team = await getTeam(params.teamId!);
  if (!team) {
    throw json({ message: 'Not found' }, { status: 404 });
  }
  return defer({ team, stats: getTeamStats(team.id) });
}

export default function Team() {
  const { team, stats } = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>{team.name}</h1>
      <Suspense fallback={<p>Loading stats...</p>}>
        <Await resolve={stats}>{s => <p>{s.wins} wins</p>}</Await>
      </Suspense>
    </div>
  );
}
