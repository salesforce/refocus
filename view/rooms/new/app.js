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

const url = require('url');
const ADDRESS = window.location.href;
const ONE = 1;
const NAME_PATH = 3;
const DEFAULT_ROOM_NAME = 'AUTO_GENERATED';
const uNewRoom = require('../utils/newRoom');
const uPage = require('./../utils/page');
const formContainer = document.getElementById('formContainer');

/**
 * Gets variables from an address
 *
 * @param {String} addr - Address to get the variables from
 * @returns {Object} - An object containing variables from the path
 */
function getPathVariables(addr){
  const pathName = url.parse(addr, true).pathname ?
    url.parse(addr, true).pathname.split('/') :
    '';
  const q = url.parse(addr, true);
  const qdata = q.query ? q.query : {};

  let roomName = qdata.name || '';
  if ((pathName.length > NAME_PATH) && (pathName[NAME_PATH] !== '')) {
    roomName = pathName[NAME_PATH];
  }

  if (qdata.autoNaming === 'true') {
    if (roomName === '') {
      roomName = DEFAULT_ROOM_NAME;
    }

    roomName += ('_' + Date.now());
  }

  const paramType = qdata.roomType || '';
  const paramActive = qdata.active !== 'false';
  const paramExternalId = qdata.externalId || null;
  let paramSettings;
  try {
    paramSettings = qdata.settings ? JSON.parse(qdata.settings) : {};
  } catch (e) {
    paramSettings = {};
  }

  const paramBots = qdata.bots ? qdata.bots.split(',') : [];

  return {
    name: roomName,
    roomType: paramType,
    active: paramActive,
    externalId: paramExternalId,
    settings: paramSettings,
    bots: paramBots,
  };
}

window.onload = () => {
  const paramaters = getPathVariables(ADDRESS);
  ReactDOM.render(
    <FormController
      name={paramaters.name}
      type={paramaters.roomType}
      active={paramaters.active}
      externalId={paramaters.externalId}
      settings={paramaters.settings}
      bots={paramaters.bots}
    />,
    formContainer
  );

  if (paramaters.name &&
    paramaters.roomType) {
    uNewRoom.checkIfRoomExistsFromName(paramaters.name)
    .then((roomExists) => {
      if (roomExists) {
        window.location.replace(`/rooms/${paramaters.name}`);
      } else {
        const q = url.parse(ADDRESS, true);
        const qdata = q.query ? q.query : {};
        uNewRoom.createRoomFromParameters(paramaters)
        .then(() => {
          if (qdata.keepParams) {
            window.location.replace(
              `/rooms/${paramaters.name}?${ADDRESS.split('?')[ONE]}`);
          } else {
            window.location.replace(`/rooms/${paramaters.name}`);
          }
        });
      }
    });
  } else {
    uPage.removeSpinner();
  }
};

// For testing
module.exports = () => {
  return {
    getPathVariables,
  };
};
