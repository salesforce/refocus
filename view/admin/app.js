/**
 * view/admin/index.js
 *
 * Passes store and history to the rendered Root element.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { browserHistory } from 'react-router';
import configureStore from './utils/configure-store';
import { syncHistoryWithStore } from 'react-router-redux';
import Root from './Root';

// initialState of {}
const store = configureStore();
const history = syncHistoryWithStore(browserHistory, store);

ReactDOM.render(
  <Root store={ store } history={ history } />,
  document.getElementById('app')
);
