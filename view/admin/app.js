/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/app.js
 *
 * Passes store and history to the rendered Root element.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { browserHistory } from 'react-router';
import configureStore from './utils/configure-store';
import { syncHistoryWithStore } from 'react-router-redux';
import Root from './Root';

debugger
// initialState of {}
console.log('configureStore');
const store = configureStore();
const history = syncHistoryWithStore(browserHistory, store);

console.log('admin app', history);
ReactDOM.render(
  <Root store={ store } history={ history } />,
  document.getElementById('app')
);
