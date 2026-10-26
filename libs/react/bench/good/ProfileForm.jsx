import { useActionState, useOptimistic } from 'react';
import { useFormStatus } from 'react-dom';

async function updateProfile(previousState, formData) {
  const displayName = String(formData.get('displayName') ?? '').trim();
  if (displayName.length < 2) {
    return { ...previousState, error: 'Display name is too short' };
  }
  const res = await fetch('/api/profile', { method: 'PATCH', body: formData });
  if (!res.ok) return { ...previousState, error: 'Save failed' };
  return { displayName, error: null };
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}

export function ProfileForm({ initialName }) {
  const [state, formAction] = useActionState(updateProfile, {
    displayName: initialName,
    error: null,
  });
  const [optimisticName, setOptimisticName] = useOptimistic(state.displayName);

  async function submit(formData) {
    setOptimisticName(String(formData.get('displayName') ?? ''));
    await formAction(formData);
  }

  return (
    <form action={submit}>
      <title>{`Profile: ${optimisticName}`}</title>
      <p>Signed in as {optimisticName}</p>
      <input name="displayName" defaultValue={state.displayName} />
      <SaveButton />
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
