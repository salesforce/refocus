/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/rooms/new/app.js
 *
 * When page is loaded we take all the bots queried and processed
 * to have their UI appended to the page.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import FormController from './FormController';
// import moment from 'moment';

// const u = require('../../utils');
const uPage = require('./../utils/page');
const formContainer = document.getElementById('formContainer');
// const GET_ROOMS = '/v1/rooms';
// const GET_ROOMTYPES = '/v1/roomTypes';


// const ROOM_TYPE_ID = window.location.pathname.split('/rooms/types/')[1];
// const GET_ROOMTYPE = '/v1/roomTypes';

window.onload = () => {
  uPage.setTitle('Create new room');
  uPage.setSubtitle(
    `Fill in data to create a new room.
    Click "Create Room" when you are ready to create room`
  );
  ReactDOM.render(
    <FormController
    />,
    formContainer
  );
  uPage.removeSpinner();
};
