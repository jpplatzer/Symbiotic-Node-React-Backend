const React = require('react')
const { render } = require('react-dom')
const { Provider } = require('react-redux')
const { createStore } = require('redux')
import initRedux from './init-redux';
const routes = require('./routes.js')
import '../../app_server/public/css/App.css';

const initialState = window.__INITIAL_STATE;
const store = initRedux(initialState);

// console.log("Data to hydrate with", initialState);

render(
  <Provider store={store}>
    {routes}
  </Provider>,
  document.getElementById('content')
);
