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
const request = require('superagent');
const url = require('url');
const address = window.location.href;
const NAME_PATH = 3;
const pathName = url.parse(address, true).pathname.split('/');
const q = url.parse(address, true);
const qdata = q.query ? q.query : {};

const uPage = require('./../utils/page');
const formContainer = document.getElementById('formContainer');

function getPathVariables(){
  let paramName = qdata.name || '';
  if ((pathName.length > NAME_PATH) && (pathName[NAME_PATH] !== '')) {
    paramName = pathName[NAME_PATH];
  }

  const paramType = qdata.roomType || '';
  const paramActive = qdata.active !== 'false';
  const paramExternalId = qdata.externalId || '';
  let paramSettings;
  try {
    paramSettings = qdata.settings ? JSON.parse(qdata.settings) : {};
  } catch (e) {
    paramSettings = {};
  }
  const paramBots = qdata.bots ? qdata.bots.split(',') : [];

  return {
    name: paramName,
    roomType: paramType,
    active: paramActive,
    externalId: paramExternalId,
    settings: paramSettings,
    bots: paramBots,
  };
}

function createRoom(paramaters){
  const req = request.post('/v1/rooms');
  const obj = {
    name: paramaters.name,
    type: paramaters.roomType,
    externalId: paramaters.externalId,
    active: paramaters.active,
  };
  req
    .send(obj)
    .end((error, res) => {
      if (error) {
        if (error.response.text.includes('SequelizeUniqueConstraintError')) {
          window.location.href = `/rooms/${paramaters.name}`;
        }
        console.error(error.response.text);
      } else {
        if (qdata.keepParams) {
          window.location.replace(`/rooms/${res.body.id}?${address.split('?')[1]}`);
        } else {
          window.location.replace(`/rooms/${res.body.id}`);
        }
      }
    });
}

window.onload = () => {
  const paramaters = getPathVariables();
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
    paramaters.roomType &&
    paramaters.active &&
    paramaters.externalId) {
    createRoom(paramaters);
  } else {
    uPage.removeSpinner();
  }
};

// For testing
module.exports = () => {
  return {
    getPathVariables
  };
};
