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

const botsContainer = document.getElementById('botsContainer');
const AdmZip = require('adm-zip');
const u = require('../utils');
const uPage = require('./utils/page');
const ROOM_ID = window.location.pathname.split('/rooms/')[1];
const GET_BOTS = '/v1/bots';
const GET_ROOM = '/v1/rooms/' + ROOM_ID;
const GET_ROOMTYPES = '/v1/roomTypes';
let _io;
let botInfo = {};

/**
 * Creates headers for each bot added to the UI
 *
 * @param {Object} bots - Bot response with UI
 */
function createHeader(bot) {
  const section = document.createElement('div');
  section.className = 'slds-section slds-is-open';

  const title = document.createElement('div');

  const text = document.createElement('h3');
  text.className =
    'slds-section__title ' +
    'slds-p-horizontal_small ' +
    'slds-theme_shade ';
  text.innerHTML = bot.name;

  const url = document.createElement('p');
  url.className =
    'slds-text-body_small ' +
    'slds-line-height_reset ' +
    'slds-p-horizontal_small ' +
    'slds-theme_shade';
  url.innerHTML = bot.url;
  url.setAttribute(
    'style',
    'padding:0px 12px 5px 12px;'
  );

  const circle = document.createElement('div');
  if (bot.active) {
    circle.setAttribute(
      'style',
      'background:#04844b;width:8px;height:8px;border-radius:50%;margin:5px;'
    );
  } else {
    circle.setAttribute(
      'style',
      'background:#c23934;width:8px;height:8px;border-radius:50%;margin:5px;'
    );
  }

  circle.className = 'slds-float_right';

  title.appendChild(text);
  title.appendChild(url);
  text.appendChild(circle);
  section.appendChild(title);

  return section;
}

/**
 * Setup the socket.io client to listen to a namespace, where the namespace is
 * named for the root subject of the perspective.
 *
 * @param  {Object} persBody - Perspective object
 */
function setupSocketIOClient(bots) {
  bots.forEach((bot) => {
    botInfo[bot.body.id] = bot.body.name;
  });

  const socket = _io('/', { transports: ['websocket'] });

  const settingsChangedEventName =
    'refocus.internal.realtime.room.settingsChanged';
  const botActionsUpdate =
    'refocus.internal.realtime.bot.action.update';
  const botDataAdd =
    'refocus.internal.realtime.bot.data.add';
  const botDataUpdate =
    'refocus.internal.realtime.bot.data.update';
  const botEventAdd =
    'refocus.internal.realtime.bot.event.add';

  socket.on('connect', () => {
    console.log('Socket Connected');
    bots.forEach((bot) => {
      parseBot(bot.body);
    });
  });

  socket.on(settingsChangedEventName, (data) => {
    const eventData = JSON.parse(data);
    const room = eventData[settingsChangedEventName];
    document.body
    .dispatchEvent(new CustomEvent('refocus.room.settings', {
      detail: room,
    }));
  });

  socket.on(botActionsUpdate, (data) => {
    const eventData = JSON.parse(data);
    const action = eventData[botActionsUpdate];
    document.getElementById(botInfo[action.new.botId])
    .dispatchEvent(new CustomEvent('refocus.bot.actions', {
      detail: action.new,
    }));
  });

  socket.on(botDataAdd, (data) => {
    const eventData = JSON.parse(data);
    const bd = eventData[botDataAdd];
    document.getElementById(botInfo[bd.botId])
    .dispatchEvent(new CustomEvent('refocus.bot.data', {
      detail: bd,
    }));
  });

  socket.on(botDataUpdate, (data) => {
    const eventData = JSON.parse(data);
    const bd = eventData[botDataUpdate];
    document.getElementById(botInfo[bd.new.botId])
    .dispatchEvent(new CustomEvent('refocus.bot.data', {
      detail: bd.new,
    }));
  });

  socket.on(botEventAdd, (data) => {
    const eventData = JSON.parse(data);
    const events = eventData[botEventAdd];
    Object.keys(botInfo).forEach((key) => {
      document.getElementById(botInfo[key])
      .dispatchEvent(new CustomEvent('refocus.events', {
        detail: events,
      }));
    });
  });

  socket.on('disconnect', () => {
     console.log('Socket Disconnected');
  });
} // setupSocketIOClient

/**
 * Create DOM elements for each of the files in the bots zip.
 *
 * @param {Object} bots - Bot response with UI
 */
function parseBot(bot) {
  // Unzip bots
  const zip = new AdmZip(new Buffer(bot.ui.data));
  const zipEntries = zip.getEntries();

  // Get the bots section of the page
  const botScript = document.createElement('script');
  const botContainer = document.createElement('div');
  botContainer.className = 'slds-large-size--1-of-3';
  const contentSection = document.createElement('div');
  contentSection.className = 'slds-section__content';
  const headerSection = createHeader(bot);

  // 'index.html' contains root elements that scripts hook up to
  // and needs to be loaded into the DOM first
  const index = zipEntries.filter((entry) => entry.name === 'index.html');
  if (index.length > 0) {
    contentSection.innerHTML = zip.readAsText(index[0]);
    headerSection.appendChild(contentSection);
    botContainer.appendChild(headerSection);
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
} // parseBots

window.onload = () => {
  _io = io;

  uPage.setTitle(`Room # ${ROOM_ID}`);
  u.getPromiseWithUrl(GET_ROOM)
  .then((res) => {
    uPage.setSubtitle(res.body.name);
    return u.getPromiseWithUrl(GET_ROOMTYPES + '/' + res.body.type);
  })
  .then((res) => {
    const promises = res.body.bots.map((botName) =>
      u.getPromiseWithUrl(GET_BOTS + '/' + botName));
    return Promise.all(promises);
  })
  .then((res) => {
    setupSocketIOClient(res);
    uPage.removeSpinner();
  });
};
