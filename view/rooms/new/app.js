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
const address = window.location.href;
const NAME_PATH = 3;

const uPage = require('./../utils/page');
const formContainer = document.getElementById('formContainer');

function getPathVariables(adr){
  const pathName = url.parse(adr, true).pathname.split('/');
  const q = url.parse(adr, true);
  const qdata = q.query ? q.query : {};

  let paramName = qdata.name || '';
  if ((pathName.length > NAME_PATH) && (pathName[NAME_PATH] !== '')) {
    paramName = pathName[NAME_PATH];
  }

  const paramType = qdata.roomType || '';
  const paramActive = qdata.active === 'true';
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
    type: paramType,
    active: paramActive,
    externalId: paramExternalId,
    settings: paramSettings,
    bots: paramBots,
  };
}

window.onload = () => {
  const paramaters = getPathVariables(address);
  ReactDOM.render(
    <FormController
      name={paramaters.name}
      type={paramaters.type}
      active={paramaters.active}
      externalId={paramaters.externalId}
      settings={paramaters.settings}
      bots={paramaters.bots}
    />,
    formContainer
  );
  uPage.removeSpinner();
};

//for testing
module.exports = () => {
  return {
    getPathVariables
  };
};
