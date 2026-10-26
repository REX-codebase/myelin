import { useNavigation, useMatches } from 'react-router';

export function SaveButton() {
  const navigation = useNavigation();
  const matches = useMatches();
  const rootData = matches[0].data;
  const saving = navigation.state === 'submitting' && navigation.formMethod === 'post';

  return (
    <button type="submit" disabled={saving}>
      {saving ? 'Saving...' : `Save as ${rootData.user.name}`}
    </button>
  );
}
