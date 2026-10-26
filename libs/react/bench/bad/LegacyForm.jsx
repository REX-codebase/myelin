import React from 'react';

export class FormRoot extends React.Component {
  static childContextTypes = {
    onFieldChange: () => null,
  };

  getChildContext() {
    return { onFieldChange: this.handleFieldChange };
  }

  handleFieldChange = (name, value) => {
    this.setState({ [name]: value });
  };

  componentDidMount() {
    this.refs.firstField.focus();
  }

  render() {
    return (
      <form>
        <input ref="firstField" name="email" />
        {this.props.children}
      </form>
    );
  }
}

export class Field extends React.Component {
  static contextTypes = {
    onFieldChange: () => null,
  };

  render() {
    return (
      <input
        name={this.props.name}
        onChange={e => this.context.onFieldChange(this.props.name, e.target.value)}
      />
    );
  }
}
