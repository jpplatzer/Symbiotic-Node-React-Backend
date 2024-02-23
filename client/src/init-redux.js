// Initialize redux
// Copyright 2018 Jeff Platzer. All rights reserved.

import {
  createStore,
  combineReducers,
  applyMiddleware,
  compose } from 'redux';
const { reducers } = require('./modules')
import thunk from 'redux-thunk';

export default function (initialStore={}) {
  return createStore(reducers,
    initialStore,
    applyMiddleware(thunk)
  );
}
