import { Component } from 'react';
import { findDOMNode, useFormState } from 'react-dom';

async function signup(prevState, formData) {
  const res = await fetch('/api/signup', { method: 'POST', body: formData });
  if (!res.ok) return { error: 'Signup failed' };
  return { error: null };
}

export function SignupForm() {
  const [state, formAction] = useFormState(signup, { error: null });
  return (
    <form action={formAction}>
      <input type="email" name="email" required />
      <button type="submit">Sign up</button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}

export class AutoSelect extends Component {
  componentDidMount() {
    const node = findDOMNode(this);
    node.select();
  }

  render() {
    return <input defaultValue={this.props.value} />;
  }
}
