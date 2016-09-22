/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/reducers/index.js
 *
 * Combines the app's reducers with the router reducer.
 * Returns the combined reducer,
 */

import refocusReducer from './refocusReducer';
import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';

const rootReducer = combineReducers({
  refocusReducer,
  routing: routerReducer,
});

export default rootReducer;
