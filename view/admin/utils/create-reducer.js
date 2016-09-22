/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 *
 * view/admin/utils/create-reducer.js
 *
 * Given the initialState, and the actionHandlers,
 * return the state object after going through the actions
 *
 * @param {Object} initialState
 * @param {Object} actionHandlers
 * @returns {Object} The state object: includes the adjusted state(s)
 * and other states (which stayed the same)
 */
export default function createReducer (initialState, actionHandlers) {
  return (state = initialState, action) => {
    const reduceFn = actionHandlers[action.type];
    if (!reduceFn) {
      return state;
    }

    return { ...state, ...reduceFn(state, action) };
  };
}
