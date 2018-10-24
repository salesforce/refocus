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
const url = require('url');

const u = require('../../utils');
const uPage = require('./../utils/page');
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
const filterType = qdata.type;
const filterActive = qdata.active;

const offset = currentPage > ZERO ?
  (currentPage - ONE) * MAX_ROOM_NUMBERS :
  ZERO;

window.onload = () => {
  let roomsQueryUrl = `${GET_ROOMS}?limit=${MAX_ROOM_NUMBERS}&offset=${offset}&sort=-id`;

  if (filterType) {
    roomsQueryUrl += `&type=${filterType}`;
  }

  if (filterActive) {
    roomsQueryUrl += `&active=${filterActive}`;
  }

  let rooms;
  let roomTypes;
  let numRooms;
  uPage.setRoomsTab();
  u.getPromiseWithUrl(roomsQueryUrl)
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
 * Creates a select DOM element with given options.
 *
 * @param {Array} options - Options for select dropdown.
 * @param {String} selected - Default selected option/
 *
 * @returns {DOM} - Select element with options as dropdown.
 */
function createSelectEl(options, selected) {
  const selEl = document.createElement('select');
  options.forEach((o) => {
    const option = document.createElement('option');
    option.value = o;
    option.innerText = o;

    if (selected && (o.toLowerCase() === selected.toLowerCase())) {
      option.selected = 'selected';
    }

    selEl.appendChild(option);
  });

  selEl.className = 'slds-select slds-m-right--small';
  selEl.style.width = 'auto';
  return selEl;
}

/**
 * Constructs a url with filters as parameters.
 *
 * @param {String} filter - Type of filter that has changed.
 * @param {String} value - New value of the filter.
 *
 * @returns {String} - Url generated from new filter change.
 */
function constructListFilterUrl(filter, value) {
  let url = '/rooms?'
  if (filter === 'active') {
    url += `page=1${filterType ? `&type=${filterType}` : ''}`;
    if (value !== 'All') {
      url += `&active=${value}`;
    }
  } else if (filter === 'page') {
    url += `page=${value}${filterType ?
      `&type=${filterType}` : ''}${filterActive ?
        `&active=${filterActive}` : ''}`;
  } else if (filter === 'type') {
    url += `page=1${filterActive ? `&active=${filterActive}` : ''}`;
    if (value !== 'All') {
      url += `&type=${value}`;
    }
  }

  return url;
}

/**
 * Passes data on to Controller to pass onto renderers.
 *
 * @param {Object} values Data returned from AJAX.
 */
function loadController(rooms, roomTypes, numRooms) {
  const numPages = parseInt(numRooms/MAX_ROOM_NUMBERS) + ONE;
  uPage.setTitle('Refocus Rooms');
  uPage.setSubtitle(`Number of rooms: ${numRooms}`);
  const subtitle = document.getElementById('subTitle');
  const filterDiv = document.createElement('div');
  const pageSelectDiv = document.createElement('div');
  pageSelectDiv.className = 'slds-m-top--x-small';
  filterDiv.className = 'slds-m-top--x-small slds-m-bottom--x-small';

  const typeArr = ['All'];
  roomTypes.forEach((rt) => {
    typeArr.push(rt.name);
  });

  const typeDrop = createSelectEl(typeArr, filterType);
  typeDrop.onchange = ((e) => {
    window.location.href = constructListFilterUrl('type', e.target.value);
  });

  const activeDrop = createSelectEl(['All', 'true', 'false'], filterActive);
  activeDrop.onchange = ((e) => {
    window.location.href = constructListFilterUrl('active', e.target.value);
  });

  const pageArr = [];

  for (let i = ONE; i < numPages + ONE; i++) {
    pageArr.push(i.toString());
  }

  const pageDrop = createSelectEl(pageArr, currentPage.toString());
  pageDrop.onchange = ((e) => {
    window.location.href = constructListFilterUrl('page', e.target.value);
  });

  pageSelectDiv.appendChild(document.createTextNode("Page: "));
  pageSelectDiv.appendChild(pageDrop);
  filterDiv.appendChild(document.createTextNode("Type: "));
  filterDiv.appendChild(typeDrop);
  filterDiv.appendChild(document.createTextNode('Active: '));
  filterDiv.appendChild(activeDrop);
  filterDiv.appendChild(pageSelectDiv);
  subtitle.appendChild(filterDiv);

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
    <div>
    { rows.length > 0 ?
      <ListController
        tableHeaders={ headers }
        tableRows={ rows }
      />
      :
      <div className="slds-text-align--center">
        <h1 className="slds-page-header__title slds-p-around--small">
          No Rooms Match Current Filter..
        </h1>
        <img src="./static/images/empty-state-events.svg"/>
      </div>
    }
    </div>,
    roomsListContainer
  );
}

// For testing
module.exports = {
  createSelectEl,
  constructListFilterUrl
}
