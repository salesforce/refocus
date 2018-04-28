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
const url = require('url');
const roomsListContainer = document.getElementById('roomsListContainer');
const header = document.getElementById('header');
const GET_ROOMS = '/v1/rooms';
const GET_ROOMTYPES = '/v1/roomTypes';
const address = window.location.href;
const ZERO = 0;
const ONE = 1;
const MAX_ROOM_NUMBERS = 25;
const q = url.parse(address, true);
const qdata = q.query || {};
const currentPage = qdata.page ? parseInt(qdata.page, 10) : ONE;
const offset = currentPage > ZERO ?
  (currentPage - ONE) * MAX_ROOM_NUMBERS :
  ZERO;

window.onload = () => {
  let rooms;
  let roomTypes;
  let numRooms;
  uPage.setRoomsTab();
  u.getPromiseWithUrl(
    `${GET_ROOMS}?limit=${MAX_ROOM_NUMBERS}&offset=${offset}&sort=-id`
  )
  .then((res) => {
    numRooms = Number(res.header['x-total-count']);
    rooms = res.body;
    return u.getPromiseWithUrl(GET_ROOMTYPES);
  })
  .then((res) => {
    roomTypes = res.body;
    loadController(rooms, roomTypes, numRooms);
  });
};

/**
 * Passes data on to Controller to pass onto renderers.
 *
 * @param {Object} values Data returned from AJAX.
 */
function loadController(rooms, roomTypes, numRooms) {
  uPage.setTitle('Refocus Rooms');

  const numPages = parseInt(numRooms/MAX_ROOM_NUMBERS) + ONE;
  const redirect = 'if (this.value)' +
    ' window.location.href= \'/rooms?page=\' + this.value';
  let pageOptions = '<div>Page: <select onChange="' + redirect + '">';
  for (let i = ONE; i < numPages + ONE; i++) {
    if (i === currentPage) {
      pageOptions += '<option value="'+i+'" selected>' + i + '</option>';
    } else {
      pageOptions += '<option value="'+i+'">' + i + '</option>';
    }
  }
  pageOptions += '</select></div>';

  uPage.setSubtitle(`Number of rooms: ${numRooms} ${pageOptions}`);

  const createNewBotton = `<div class="slds-form-element" style="float: right;">
    <button
      class="slds-button slds-button_neutral"
      onClick="window.location.href = '/rooms/new';">
      New
    </button>
  </div>`;

  header.insertAdjacentHTML('afterbegin', createNewBotton);

  const headers = ['ID', 'Name', 'Type', 'Active', 'Created At', 'Updated At'];
  const rows = rooms.map((room) => {
    const roomType = roomTypes.filter((rt) => rt.id === room.type);
    const { id } = room;
    room.id =`<a href=/rooms/${id} target='_blank' rel='noopener noreferrer'>
      ${id}
    </a>`;
    room.name = `<a href=/rooms/${id} target='_blank' rel='noopener noreferrer'>
      ${room.name}
    </a>`;
    room.type = `<a href=/rooms/types/${roomType[ZERO].id}>
      ${roomType[ZERO].name}
    </a>`;
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

