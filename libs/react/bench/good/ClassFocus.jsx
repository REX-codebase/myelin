import { Component, createContext } from 'react';

export const LocaleContext = createContext('en');

export class AutoFocusInput extends Component {
  static contextType = LocaleContext;
  static defaultProps = { placeholder: 'Type here' };

  componentDidMount() {
    this.input?.focus();
  }

  render() {
    return (
      <input
        lang={this.context}
        placeholder={this.props.placeholder}
        ref={node => {
          this.input = node;
        }}
      />
    );
  }
}
