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
const ZERO = 0;
const ONE = 1;
const botsContainer = document.getElementById('botsContainer');
const activeToggle = document.getElementById('activeToggle');
const confirmButton = document.getElementById('confirm_button');
const declineButton = document.getElementById('decline_button');
const confirmationModal =
  document.getElementById('active_confirmation_modal');
const confirmationText =
  document.getElementById('active_confirmation_text');
const AdmZip = require('adm-zip');
const u = require('../utils');
const uPage = require('./utils/page');
const ROOM_ID = window.location.pathname.split('/rooms/')[ONE];
const GET_BOTS = '/v1/bots';
const GET_ROOM = '/v1/rooms/' + ROOM_ID;
const GET_ROOMTYPES = '/v1/roomTypes';
const GITHUB_LOGO = '../static/images/GitHub-Mark.png';
let _io;
let _user;
let _roomName;
let _isActive;
let botInfo = {};
const DEBUG_REALTIME = window.location.href.split(/[&\?]/)
  .includes('debug=REALTIME');

/**
 * Creates headers for each bot added to the UI
 *
 * @param {Object} msg - Bot response with UI
 * @param {Object} obj - Bot response with UI
 */
function debugMessage(msg, obj){
  if ((DEBUG_REALTIME) && obj) {
    console.log(msg, obj);
  } else if (DEBUG_REALTIME) {
    console.log(msg);
  }
}

/**
 * Creates headers for each bot added to the UI
 *
 * @param {Object} bot - Bot response with UI
 * @returns {DOM} section - Header section
 */
function createHeader(bot) {
  const section = document.createElement('div');
  section.className = 'slds-section slds-is-open';

  section.setAttribute(
    'style',
    'box-shadow:0px 0px 20px 2px #e2e2e2;margin:1rem;'
  );

  const title = document.createElement('div');

  const text = document.createElement('h3');
  text.className =
    'slds-section__title ' +
    'slds-p-horizontal_small ' +
    'slds-theme_shade ';
  text.innerHTML = bot.name;

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
  text.appendChild(circle);
  section.appendChild(title);

  return section;
}

/**
 * Creates footers for each bot added to the UI
 *
 * @param {Object} bot - Bot response with UI
 * @returns {DOM} footer - Footer section
 */
function createFooter(bot) {
  const footer = document.createElement('h3');
  const linkedElement = document.createElement('a');
  const gitHubImage = document.createElement('img');

  footer.className =
    'slds-section__title ' +
    'slds-p-horizontal_small ' +
    'slds-theme_shade ';

  linkedElement.href = bot.url;
  linkedElement.target = '_blank';
  linkedElement.rel = 'noopener noreferrer';
  gitHubImage.height = '20';
  gitHubImage.width = '20';
  gitHubImage.src = GITHUB_LOGO;
  linkedElement.appendChild(gitHubImage);
  footer.appendChild(linkedElement);

  return footer;
}

/**
 * Create DOM elements for each of the files in the bots zip.
 *
 * @param {Object} bot - Bot response with UI
 */
function parseBot(bot) {
  // Unzip bots
  const zip = new AdmZip(new Buffer(bot.ui.data));
  const zipEntries = zip.getEntries();
  const botScript = document.createElement('script');
  botScript.id = bot.name + '-script';

  // Get the bots section of the page
  const botContainer = document.createElement('div');
  botContainer.id = bot.name + '-section';
  botContainer.className = 'slds-large-size--1-of-3';
  const contentSection = document.createElement('div');
  contentSection.className = 'slds-section__content';
  const headerSection = createHeader(bot);
  const footerSection = createFooter(bot);

  // 'index.html' contains root elements that scripts hook up to
  // and needs to be loaded into the DOM first
  const index = zipEntries.filter((entry) => entry.name === 'index.html');
  if (index.length > ZERO) {
    contentSection.innerHTML = zip.readAsText(index[ZERO]);
    headerSection.appendChild(contentSection);
    headerSection.appendChild(footerSection);
    botContainer.appendChild(headerSection);
    botsContainer.appendChild(botContainer);
  }

  // go through zipEntries that arent 'index.html'
  zipEntries.filter(
    (entry) => entry.name !== 'index.html'
  ).forEach((script) => {
    botScript.appendChild(
      document.createTextNode(zip.readAsText(script))
    );
    document.body.appendChild(botScript);
  });
} // parseBots

/**
 * Setup the socket.io client to listen to a namespace, and once sockets
 * are connected install the bots in the room.
 *
 * @param  {Array} bots - Array of Bots
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
    debugMessage('Socket Connected');
    bots.forEach((bot) => {
      if (document.getElementById(bot.body.name + '-section')) {
        document.getElementById(bot.body.name + '-section').remove();
        document.getElementById(bot.body.name + '-script').remove();
      }
    });
    bots.forEach((bot) => {
      parseBot(bot.body);
    });
  });

  socket.on(settingsChangedEventName, (data) => {
    const eventData = JSON.parse(data);
    const room = eventData[settingsChangedEventName];
    if (room.id === parseInt(ROOM_ID, 10)) {
      debugMessage('Setting Changed', room);
      document.body
      .dispatchEvent(new CustomEvent('refocus.room.settings', {
        detail: room,
      }));
    }
  });

  socket.on(botActionsUpdate, (data) => {
    const eventData = JSON.parse(data);
    const action = eventData[botActionsUpdate];
    if (action.new.roomId === parseInt(ROOM_ID, 10)) {
      debugMessage('BotActions Updated', action);
      document.getElementById(botInfo[action.new.botId])
      .dispatchEvent(new CustomEvent('refocus.bot.actions', {
        detail: action.new,
      }));
    }
  });

  socket.on(botDataAdd, (data) => {
    const eventData = JSON.parse(data);
    const bd = eventData[botDataAdd];
    if (bd.roomId === parseInt(ROOM_ID, 10)) {
      debugMessage('BotData Added', bd);
      document.getElementById(botInfo[bd.botId])
      .dispatchEvent(new CustomEvent('refocus.bot.data', {
        detail: bd,
      }));
    }
  });

  socket.on(botDataUpdate, (data) => {
    const eventData = JSON.parse(data);
    const bd = eventData[botDataUpdate];
    if (bd.new.roomId === parseInt(ROOM_ID, 10)) {
      debugMessage('BotData Updated', bd);
      document.getElementById(botInfo[bd.new.botId])
      .dispatchEvent(new CustomEvent('refocus.bot.data', {
        detail: bd.new,
      }));
    }
  });

  socket.on(botEventAdd, (data) => {
    const eventData = JSON.parse(data);
    const events = eventData[botEventAdd];
    if (events.roomId === parseInt(ROOM_ID, 10)) {
      debugMessage('Events Added', events);
      Object.keys(botInfo).forEach((key) => {
        document.getElementById(botInfo[key])
        .dispatchEvent(new CustomEvent('refocus.events', {
          detail: events,
        }));
      });

      if (events.context.type === 'RoomState') {
        document.getElementById('activeToggle')
        .dispatchEvent(new CustomEvent('refocus.events', {
          detail: events,
        }));
      }
    }
  });

  socket.on('disconnect', () => {
    debugMessage('Socket Disconnected');
  });
} // setupSocketIOClient

/**
 * Active toggle was clicked so need to show modal.
 *
 * @param  {Object} event - Clicked on toggle event.
 */
function toggleConfirmationModal(event) {
  event.preventDefault();

  confirmationModal.setAttribute(
    'style',
    'display:block;'
  );
  if (_isActive) {
    confirmationText.innerText = 'Would you like to close this room?';
  } else {
    confirmationText.innerText = 'Would you like to activate this room?';
  }
}

// Closes the confirmation modal
function closeConfirmationModal() {
  confirmationModal.setAttribute(
    'style',
    'display:none;'
  );
}

function roomStateChanged() {
  closeConfirmationModal();
  activeToggle.disabled = true;
  _isActive = !_isActive;
  const data = { active: _isActive };
  u.patchPromiseWithUrl(GET_ROOM, data)
  .then((res, err) => {
    if (err) {
      return console.log(err);
    }

    const message = _isActive ? 'Room Activated' : 'Room Closed';

    const eventType = {
      'type': 'RoomState',
      'user': _user,
      'active': _isActive,
    };

    const events = {
      log: message,
      context: eventType,
      userId: _user.id,
      roomId: parseInt(ROOM_ID, 10)
    };

    return u.postPromiseWithUrl('/v1/events', events);
  });
}

function handleEvents(evt) {
  if (evt.detail.context.type === 'RoomState') {
    evt.target.checked = evt.detail.context.active;
    _isActive = evt.detail.context.active;
    evt.target.disabled = false;
  }
}

window.onload = () => {
  activeToggle.addEventListener('click', toggleConfirmationModal);
  activeToggle.addEventListener('refocus.events', handleEvents, false);
  confirmButton.onclick = roomStateChanged;
  declineButton.onclick = closeConfirmationModal;

  // Note: this is declared in index.pug:
  _io = io;
  _user = JSON.parse(user.replace(/&quot;/g, '"'));

  uPage.setTitle(`Room # ${ROOM_ID}`);
  u.getPromiseWithUrl(GET_ROOM)
  .then((res) => {
    _roomName = res.body.name;
    _isActive = res.body.active;
    activeToggle.checked = _isActive;
    return u.getPromiseWithUrl(GET_ROOMTYPES + '/' + res.body.type);
  })
  .then((res) => {
    uPage.setSubtitle(`${_roomName} - ${res.body.name}`);
    const promises = res.body.bots.map((botName) =>
      u.getPromiseWithUrl(GET_BOTS + '/' + botName));
    return Promise.all(promises);
  })
  .then((res) => {
    setupSocketIOClient(res);
    uPage.removeSpinner();
  });
};
