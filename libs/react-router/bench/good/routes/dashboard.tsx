import { createContext, redirect, useMatches } from 'react-router';
import type { Route } from './+types/dashboard';
import { getUser } from '~/session.server';

export const userContext = createContext<{ id: string; name: string } | null>(null);

const authMiddleware: Route.MiddlewareFunction = async ({ request, context }) => {
  const user = await getUser(request);
  if (!user) throw redirect('/login');
  context.set(userContext, user);
};

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export async function loader({ context }: Route.LoaderArgs) {
  return { user: context.get(userContext) };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const matches = useMatches();
  const crumbs = matches.map(m => m.loaderData).filter(Boolean).length;
  return <h1>Hi {loaderData.user?.name} ({crumbs} levels)</h1>;
}
