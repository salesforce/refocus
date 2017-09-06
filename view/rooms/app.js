/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/rooms/app.js
 *
 * When page is loaded we take all the bots queried and processed
 * to have their UI appended to the page.
 */

import request from 'superagent';
const botsContainer = document.getElementById('botsContainer');
const AdmZip = require('adm-zip');
const u = require('../utils');
const ROOM_ID = window.location.pathname.split('/rooms/')[1];
const GET_BOTS = '/v1/bots';
const GET_ROOM = '/v1/rooms/' + ROOM_ID;
const GET_ROOMTYPES = '/v1/roomTypes';
const REQ_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest',
  Expires: '-1',
  'Cache-Control': 'no-cache,no-store,must-revalidate,max-age=-1,private',
};
const SPINNER_ID = 'loading_spinner';

/**
 * Create DOM elements for each of the files in the bots zip.
 *
 * @param {Object} bots - The ui buffer saved in the bots ui
 */
function parseBot(bot) {
  // Unzip bots
  const zip = new AdmZip(new Buffer(bot.ui.data));
  const zipEntries = zip.getEntries();

  const i = document.createElement('div');
  i.className = 'slds-section slds-is-open';

  const p = document.createElement('div');

  const q = document.createElement('h3');
  q.className = 'slds-section__title slds-theme_shade';

  const t = document.createElement('span');
  t.className = 'slds-p-horizontal_small';
  t.innerHTML = bot.name;

  const r = document.createElement('p');
  r.className = 'slds-text-body_small slds-line-height_reset';
  r.innerHTML = bot.url;

  const c = document.createElement('div');
  c.className = 'slds-section__content';

  p.appendChild(q);
  q.appendChild(t);
  q.appendChild(r);
  i.appendChild(p);

  // Get the bots section of the page
  const botContainer = document.createElement('div');
  botContainer.className = 'slds-large-size--1-of-3';
  const botScript = document.createElement('script');

  // 'index.html' contains root elements that scripts hook up to
  // and needs to be loaded into the DOM first
  const index = zipEntries.filter((entry) => entry.name === 'index.html');
  if (index.length > 0) {
    c.innerHTML = zip.readAsText(index[0]);
    i.appendChild(c);
    botContainer.appendChild(i);
    botsContainer.appendChild(botContainer);
  }
  // go through zipEntries that arent 'index.html'
  const zipEntriesNoIndex = zipEntries.filter(
    (entry) => entry.name !== 'index.html'
  );
  for (let i = 0; i < zipEntriesNoIndex.length; i++) {
    botScript.appendChild(
      document.createTextNode(zip.readAsText(zipEntriesNoIndex[i]))
    );
    document.body.appendChild(botScript);
  }

  u.removeSpinner(SPINNER_ID);
} // parseBots

window.onload = () => {
  document.getElementById('title').innerHTML = 'Room #' + ROOM_ID;

  u.getPromiseWithUrl(GET_ROOM)
  .then((res) => {
    document.getElementById('subTitle').innerHTML = res.body.name;
    return u.getPromiseWithUrl(GET_ROOMTYPES+'/'+res.body.type);
  })
  .then((res) => {
    const promises = res.body.bots.map((botName) => {
      return u.getPromiseWithUrl(GET_BOTS + '/' + botName);
    });
    return Promise.all(promises);
  })
  .then((res) => {
    res.forEach((bot) => {
      parseBot(bot.body);
    });
  });
};
