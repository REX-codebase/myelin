import { useFetcher } from 'react-router';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

export default function Settings() {
  const fetcher = useFetcher();
  const busy = fetcher.state !== 'idle';

  async function exportData() {
    const res = await fetch('/api/export');
    const payload = await res.json();
    console.log(payload);
  }

  return (
    <fetcher.Form method="post" action="/settings/notifications">
      <FormControlLabel control={<Switch name="email" defaultChecked />} label="Email notifications" />
      <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
      <button type="button" onClick={exportData}>Export</button>
    </fetcher.Form>
  );
}
