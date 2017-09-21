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

const u = require('../../utils');
const uPage = require('./../utils/page');
const roomTypeContainer = document.getElementById('roomTypeContainer');

import React from 'react';
import ReactDOM from 'react-dom';
import RoomTypeComponent from './RoomTypeComponent';

const ROOM_TYPE_ID = window.location.pathname.split('/rooms/types/')[1];
const GET_ROOMTYPE = '/v1/roomTypes';

window.onload = () => {
  u.getPromiseWithUrl(`${GET_ROOMTYPE}/${ROOM_TYPE_ID}`)
  .then((res) => {
    const roomType = res.body;
    uPage.setTitle(roomType.name);
    uPage.setSubTitle(`Room Type Id: ${ROOM_TYPE_ID}`);
    uPage.removeSpinner();
    ReactDOM.render(
      <RoomTypeComponent
        roomType={ roomType }
      />,
      roomTypeContainer
    );
  });
};
