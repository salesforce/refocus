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
