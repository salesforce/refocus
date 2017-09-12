/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/roomTypes/list/app.js
 *
 * Create a list of all the Room Types in refocus
 *
 */

import React from 'react';
import ReactDOM from 'react-dom';
import ListController from './ListController';
const u = require('../../utils');
const listContainer = document.getElementById('root');
const GET_ROOMTYPES = '/v1/roomTypes';

window.onload = () => {
  let roomTypes;
  u.getPromiseWithUrl(GET_ROOMTYPES)
  .then((res) => {
    roomTypes = res.body;
    loadController(roomTypes);
  })
};

/**
 * Passes data on to Controller to pass onto renderers.
 *
 * @param {Object} values Data returned from AJAX.
 */
function loadController(roomTypes) {
  ReactDOM.render(
    <ListController
      roomTypes={ roomTypes }
    />,
    listContainer
  );
}

