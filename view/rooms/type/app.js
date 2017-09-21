/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/rooms/type/app.js
 *
 * When page is loaded we take all the bots queried and processed
 * to have their UI appended to the page.
 */

const roomTypeContainer = document.getElementById('roomTypeContainer');
const u = require('../../utils');
import React from 'react';
import ReactDOM from 'react-dom';
import RoomTypeComponent from './RoomTypeComponent';

const ROOM_TYPE_ID = window.location.pathname.split('/rooms/types/')[1];
const GET_ROOMTYPE = '/v1/roomTypes';
const SPINNER_ID = 'loading_spinner';

window.onload = () => {

  u.getPromiseWithUrl(`${GET_ROOMTYPE}/${ROOM_TYPE_ID}`)
  .then((res) => {
    u.removeSpinner(SPINNER_ID);
    document.getElementById('title').innerHTML = res.body.name;
    document.getElementById('subTitle').innerHTML = 'Room Type Id: ' + ROOM_TYPE_ID;
    ReactDOM.render(
      <RoomTypeComponent />,
      roomTypeContainer
    );
  })
  .catch(error => {
    console.log(`error ${error}`);
  })
};
