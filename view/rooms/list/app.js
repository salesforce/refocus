/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/rooms/list/app.js
 *
 * Create a list of all the rooms in refocus
 *
 */

import React from 'react';
import ReactDOM from 'react-dom';
import ListController from './ListController';
import moment from 'moment';

const u = require('../../utils');
const listContainer = document.getElementById('root');
const GET_ROOMS = '/v1/rooms';
const GET_ROOMTYPES = '/v1/roomTypes';

window.onload = () => {
  let rooms;
  let roomTypes;
  u.getPromiseWithUrl(GET_ROOMS)
  .then((res) => {
    rooms = res.body;
    return u.getPromiseWithUrl(GET_ROOMTYPES);
  })
  .then((res) => {
    roomTypes = res.body;
    loadController(rooms, roomTypes);
  });
};

/**
 * Passes data on to Controller to pass onto renderers.
 *
 * @param {Object} values Data returned from AJAX.
 */
function loadController(rooms, roomTypes) {
  const headers = ['ID', 'Name', 'Type', 'Active', 'Created At', 'Updated At'];
  const rows = rooms.map(room => {
    const roomType = roomTypes.filter(rt => rt.id === room.type);
    const { id } = room;
    room.id = `<a href=/rooms/${id}>${id}</a>`;
    room.name = `<a href=/rooms/${id}>${room.name}</a>`;
    room.type = `<a href=/roomTypes/${roomType[0].id}>${roomType[0].name}</a>`;
    room.active = room.active ? 'True' : 'False';
    room.createdAt = moment(room.createdAt).format('LLL');
    room.updatedAt = moment(room.updatedAt).format('LLL');
    return room;
  });
  ReactDOM.render(
    <ListController
      pageTitle='Refocus Rooms'
      pageDescription='Number of rooms: '
      tableHeaders={ headers }
      tableRows={ rows }
    />,
    listContainer
  );
}

