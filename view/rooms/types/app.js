/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/room/types/app.js
 *
 * Create a list of all the Room Types in refocus
 *
 */

import React from 'react';
import ReactDOM from 'react-dom';
import ListController from './../list/ListController';
import moment from 'moment';

const u = require('../../utils');
const listContainer = document.getElementById('root');
const GET_ROOMTYPES = '/v1/roomTypes';

window.onload = () => {
  let roomTypes;
  u.getPromiseWithUrl(GET_ROOMTYPES)
  .then((res) => {
    roomTypes = res.body;
    loadController(roomTypes);
  });
};

/**
 * Passes data on to Controller to pass onto renderers.
 *
 * @param {Object} values Data returned from AJAX.
 */
function loadController(roomTypes) {
  const headers = ['ID', 'Name', 'Enabled', 'Bots', 'Created At', 'Updated At'];
  const rows = roomTypes.map(roomType => {
    const { id } = roomType;
    roomType.id = `<a href=/roomTypes/${id}>${id}</a>`;
    roomType.name = `<a href=/roomTypes/${id}>${roomType.name}</a>`;
    roomType.bots = String(roomType.bots);
    roomType.enabled = roomType.isEnabled ? 'True' : 'False';
    delete roomType.isEnabled;
    roomType.createdAt = moment(roomType.createdAt).format('LLL');
    roomType.updatedAt = moment(roomType.updatedAt).format('LLL');
    return roomType;
  });
  ReactDOM.render(
    <ListController
      pageTitle='Refocus Room Types'
      pageDescription='Number of room types: '
      tableHeaders={ headers }
      tableRows={ rows }
    />,
    listContainer
  );
}
