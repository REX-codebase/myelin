import { redirect, unstable_createContext } from 'react-router';
import type { Route } from './+types/dashboard';
import { getUser } from '~/session.server';

export const userContext = unstable_createContext<{ id: string; name: string } | null>(null);

export const unstable_middleware: Route.unstable_MiddlewareFunction[] = [
  async ({ request, context }) => {
    const user = await getUser(request);
    if (!user) throw redirect('/login');
    context.set(userContext, user);
  },
];

export async function loader({ context }: Route.LoaderArgs) {
  return { user: context.get(userContext) };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return <h1>Hi {loaderData.user?.name}</h1>;
}
