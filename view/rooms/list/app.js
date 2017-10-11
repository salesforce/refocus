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
const uPage = require('./../utils/page');
const roomsListContainer = document.getElementById('roomsListContainer');
const GET_ROOMS = '/v1/rooms';
const GET_ROOMTYPES = '/v1/roomTypes';

window.onload = () => {
  let rooms;
  let roomTypes;
  uPage.setRoomsTab();
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
  uPage.setTitle('Refocus Rooms');
  uPage.setSubtitle(`Number of rooms: ${rooms.length}`);

  const headers = ['ID', 'Name', 'Type', 'Active', 'Created At', 'Updated At'];
  const rows = rooms.map(room => {
    const roomType = roomTypes.filter(rt => rt.id === room.type);
    const { id } = room;
    room.id = `<a href=/rooms/${id} target='_blank' rel='noopener noreferrer'>${id}</a>`;
    room.name = `<a href=/rooms/${id} target='_blank' rel='noopener noreferrer'>${room.name}</a>`;
    room.type = `<a href=/rooms/types/${roomType[0].id}>${roomType[0].name}</a>`;
    room.active = room.active ? 'True' : 'False';
    room.createdAt = moment(room.createdAt).format('lll');
    room.updatedAt = moment(room.updatedAt).format('lll');
    return room;
  });

  uPage.removeSpinner();
  ReactDOM.render(
    <ListController
      tableHeaders={ headers }
      tableRows={ rows }
    />,
    roomsListContainer
  );
}

