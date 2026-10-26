import { Form, data, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/project';
import { getProject, updateProject } from '~/models/project.server';

export async function loader({ params }: Route.LoaderArgs) {
  const project = await getProject(params.projectId);
  if (!project) throw data('Project not found', { status: 404 });
  return { project, activity: project.loadActivity() };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return data({ error: 'Title is required' }, { status: 400 });
  await updateProject(params.projectId, { title });
  return redirect(`/projects/${params.projectId}`);
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData?.project.title ?? 'Project' }];
}

export default function Project({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const saving = navigation.state === 'submitting' && navigation.formMethod === 'POST';
  return (
    <Form method="post">
      <h1>{loaderData.project.title}</h1>
      <input name="title" defaultValue={loaderData.project.title} />
      <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
    </Form>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <p>Something went wrong: {error instanceof Error ? error.message : 'Unknown error'}</p>;
}
