import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';

const container = document.getElementById('root');

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  container
);

if (module.hot) {
  module.hot.dispose(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
}
