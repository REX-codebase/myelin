import { NavLink, useHistory, withRouter } from 'react-router';

function Nav({ location }) {
  const history = useHistory();

  return (
    <nav className="main-nav">
      <NavLink to="/dashboard" activeClassName="is-active">Dashboard</NavLink>
      <NavLink to="/settings" activeClassName="is-active">Settings</NavLink>
      <span className="path">{location.pathname}</span>
      <button onClick={() => history.goBack()}>Back</button>
      <button onClick={() => history.push('/logout')}>Log out</button>
    </nav>
  );
}

export default withRouter(Nav);
