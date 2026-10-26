import { createRoutesStub } from 'react-router';
import { render, screen } from '@testing-library/react';
import Project from './routes/project';

test('renders project title from loader', async () => {
  const Stub = createRoutesStub([
    {
      path: '/projects/:projectId',
      Component: Project,
      loader() {
        return { project: { title: 'Apollo' } };
      },
    },
  ]);

  render(<Stub initialEntries={['/projects/1']} />);
  expect(await screen.findByText('Apollo')).toBeTruthy();
});
