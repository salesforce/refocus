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
const TWO = 2;
const THREE = 3;
const botsContainer = document.getElementById('botsContainer');
const botsLeft = document.getElementById('botsLeftColumn');
const botsMiddle = document.getElementById('botsMiddleColumn');
const botsRight = document.getElementById('botsRightColumn');
const botsContainerColumns = [botsLeft, botsMiddle, botsRight];
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
let GET_ROOM = '/v1/rooms/';
GET_ROOM += isNaN(ROOM_ID) ? `?name=${ROOM_ID}` : ROOM_ID;
const GET_EVENTS = '/v1/events';
const GET_ROOMTYPES = '/v1/roomTypes';
const GITHUB_LOGO = '../static/images/GitHub-Mark.png';
const BOT_LOGO = '../static/images/refocus-bot.png';
let _io;
let _user;
let _roomName;
let _isActive;
let ghostBot;
let dummyBot;
let _movingContent;
const botInfo = {};
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

// Listen to message from child window
const eventMethod = window.addEventListener ?
  'addEventListener' : 'attachEvent';
const eventer = window[eventMethod];
const messageEvent = eventMethod === 'attachEvent' ? 'onmessage' : 'message';

eventer(messageEvent, (iframeMessage) => {
  const iframe = document
    .getElementById(iframeMessage.data.name + '-iframe-section');
  iframe.height = iframeMessage.data.height + 'px';
}, false);

/**
 * Called when bot is clicked and dragged
 *
 * @param {Object} event - Dragging bot event.
 */
function botDragHandler(event) {
  if (botsLeft.offsetWidth === botsContainer.offsetWidth || !_movingContent) {
    event.preventDefault();
  } else {
    botsContainerColumns.forEach((c) => {
      c.className = 'slds-col slds-large-size--1-of-3 col-dragging';
    });

    event.dataTransfer.setData('text', event.target.id);
  }
}

/**
 * Called when bot is able to be dropped
 *
 * @param {Object} event - Dragging bot event.
 * @param {DOM} bot - Bot container.
 */
function allowBotDropHandler(event, bot) {
  const col = bot.parentElement;
  event.preventDefault();
  col.insertBefore(ghostBot, bot);
}

/**
 * Called when bot is being dragged over a column where it can be dropped.
 *
 * @param {DOM} column - Column that bot is being dragged over.
 */
function dragOverColumnHandler(column) {
  column.appendChild(dummyBot);
}

// Called when a bot stops being dragged.
function botDragEndHandler() {
  botsContainerColumns.forEach((c) => {
    c.className = 'slds-col slds-large-size--1-of-3';
  });

  if (ghostBot.parentElement) {
    ghostBot.parentElement.removeChild(ghostBot);
  }
}

/**
 * Called when bot is dropped in a valid column.
 *
 * @param {Object} event - Dropping bot event.
 * @param {DOM} col - Column that bot is being dragged over.
 */
function drop(event, col) {
  event.preventDefault();
  const data = event.dataTransfer.getData('text');
  col.insertBefore(document.getElementById(data), ghostBot);
  const botIframe = document.getElementById(data)
    .getElementsByTagName('iframe')[ZERO];
  const botIframedoc = botIframe.contentDocument;

  if (botIframedoc && _movingContent) {
    botIframedoc.open();
    botIframedoc.writeln(_movingContent);
    botIframedoc.close();
  } else {
    debugMessage('Cannot inject dynamic contents into iframe.');
  }

  // Resetting variable
  _movingContent = null;

  if (ghostBot.parentElement) {
    ghostBot.parentElement.removeChild(ghostBot);
  }
}

/**
 * Sets up the bots to be movable between columns.
 *
 * @param {DOM} botContainer - Container of bot
 * @param {Int} botIndex - Index of the bot
 */
function setupMovableBots(botContainer, botIndex) {
  botContainer.setAttribute(
    'draggable',
    'true'
  );

  botContainer.addEventListener('dragstart', (e) => {
    botDragHandler(e);
  });

  botContainer.addEventListener('dragend', () => {
    botDragEndHandler();
  });

  botContainer.addEventListener('dragover', (e) => {
    allowBotDropHandler(e, botContainer);
  });

  // Only need to move the bot if the header is clicked
  botContainer.addEventListener('mousedown', (e) => {
    // The bot header was clicked on
    if (e.target.id === 'title-header') {
      const iframe = botContainer.getElementsByTagName('iframe')[ZERO];
      if (iframe.contentDocument) {
        _movingContent = iframe.contentDocument.head.innerHTML +
          iframe.contentDocument.body.innerHTML;
      } else if (iframe.contentWindow) {
        _movingContent = iframe.contentWindow.document.head.innerHTML +
          iframe.contentWindow.document.body.innerHTML;
      }
    }
  });

  // Adding bot to correct initial column
  if ((botIndex+ONE) % THREE === ONE) {
    botsLeft.appendChild(botContainer);
  } else if ((botIndex+ONE) % THREE === TWO) {
    botsMiddle.appendChild(botContainer);
  } else {
    botsRight.appendChild(botContainer);
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
  text.id = 'title-header';
  text.className =
    'slds-section__title ' +
    'slds-p-horizontal_small ' +
    'slds-theme_shade ';
  text.innerHTML = bot.name;
  text.style.cursor = 'pointer';

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
 * Dispatches javascript events to bots in iFrames
 *
 * @param {HTMLObject} iframe - iFrame DOM to add Bot UI
 * @param {Object} bot - Bot to add to frame
 * @param {Object} parsedBot - Object that has the HTML and JS as
 *  HTMLObject stored as key value pair
 * @param {Object} user - The current user
 */
function iframeBot(iframe, bot, parsedBot, currentUser) {
  const botScript = parsedBot.js ? parsedBot.js.innerHTML : '';
  const contentSection = parsedBot.html ? parsedBot.html.innerHTML: '';
  let iframedoc = iframe.document;
  if (iframe.contentDocument) {
    iframedoc = iframe.contentDocument;
  } else if (iframe.contentWindow) {
    iframedoc = iframe.contentWindow.document;
  }

  const iframeCss =
    `<link
      rel="stylesheet"
      type="text/css"
      href="/static/css/salesforce-lightning-design-system.2.4.3.min.css">`;

  const iframeJS =
  `<script>
      function outputsize(e) {
        parent.postMessage(
          {
            "name": "${bot.name}",
            "height": e[0].target.scrollHeight
          }, "*"
        );
      }

      new ResizeObserver(outputsize)
        .observe(document.getElementById("${bot.name}"));
    </script>`;

  if (iframedoc) {
    iframedoc.open();
    iframedoc.writeln(
      iframeCss +
      `<script>var user = "${currentUser}"</script>
      ${contentSection}
      <script>${botScript}</script>` +
      iframeJS
    );
    iframedoc.close();
  } else {
    debugMessage('Cannot inject dynamic contents into iframe.');
  }
}

/**
 * Create DOM elements for each of the files in the bots zip.
 *
 * @param {Object} bot - Bot response with UI
 * @param {Int} botIndex - Index of Bot
 * @returns {Object} - An object that stores the HTML dom and
 *   javascript dom as key value pairs
 */
function parseBot(bot) {
  const botScript = document.createElement('script');
  botScript.id = bot.name + '-script';

  const contentSection = document.createElement('div');
  contentSection.className = 'slds-section__content';

  try {
    // Unzip bots
    const zip = new AdmZip(new Buffer(bot.ui.data));
    const zipEntries = zip.getEntries();

    // 'index.html' contains root elements that scripts hook up to
    // and needs to be loaded into the DOM first
    const index = zipEntries.filter((entry) => entry.name === 'index.html');
    if (index.length > ZERO) {
      contentSection.innerHTML = zip.readAsText(index[ZERO]);
      const elem = contentSection
        .querySelector('script[src="/index_bundle.js"]');
      if (elem) {
        elem.parentNode.removeChild(elem);
      }
    }

    // go through zipEntries that arent 'index.html'
    zipEntries.filter(
      (entry) => entry.name !== 'index.html'
    ).forEach((script) => {
      botScript.appendChild(
        document.createTextNode(zip.readAsText(script))
      );
    });

    const output = {
      'html': contentSection,
      'js': botScript
    };
    return output;
  } catch (exception) {
    debugMessage('Parse Bot failed', exception);
    return {};
  }
} // parseBots

/**
 * Create and fills DOM containers for bots and adds them to
 * to the page.
 *
 * @param {Object} bot - Bot response with UI
 * @param {Int} botIndex - Index of Bot
 */
function displayBot(bot, botIndex) {
  // Get the bots section of the page
  const botContainer = document.createElement('div');
  botContainer.id = bot.name + '-section';
  const headerSection = createHeader(bot);
  const footerSection = createFooter(bot);

  const iframe = document.createElement('iframe');
  iframe.id = bot.name + '-iframe-section';
  iframe.style.display = 'block';
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.frameBorder = 0;

  headerSection.appendChild(iframe);
  headerSection.appendChild(footerSection);
  botContainer.appendChild(headerSection);
  setupMovableBots(botContainer, botIndex);
  const parsedBot = parseBot(bot);
  // user is defined in ./index.pug
  iframeBot(iframe, bot, parsedBot, user);
}

/**
 * Dispatches javascript events to bots in iFrames
 *
 * @param {String} channel - Name of channel to publish to
 * @param {Object} payload - The data that you want to send to the bot
 * @param {Object} bots - Bots Ids as keys and bot names as the values
 * @param {String} botId - (Optional) Bot Id that you want to send the event to
 * @returns {String} - Message about how the event dispatch went
 */
function createIframeEvent(channel, payload, bots, botId) {
  const dispatchObj = payload.new ? payload.new : payload;
  const target = bots[botId] ? bots[botId] : bots[dispatchObj.botId];
  const iframe = document.getElementById(
    target + '-iframe-section'
  );
  let iframedoc;
  if (iframe) {
    if (iframe.contentDocument) {
      iframedoc = iframe.contentDocument;
    } else if (iframe.contentWindow) {
      iframedoc = iframe.contentWindow.document;
    } else {
      return 'Dispatching Iframe Event Failed';
    }
  } else {
    return 'Bot not found';
  }

  iframedoc.getElementById(target)
    .dispatchEvent(new CustomEvent(channel, {
      detail: dispatchObj,
    })
  );
  return 'Success';
}

/**
 * Setup the socket.io client to listen to a namespace, and once sockets
 * are connected install the bots in the room.
 *
 * @param  {Array} bots - Array of Bots
 */
function setupSocketIOClient(bots) {
  // Map Bot Ids to Bot Names
  bots.forEach((bot) => {
    botInfo[bot.body.id] = bot.body.name;
  });

  const socket = _io('/', { transports: ['websocket'] });

  // Socket Event Names
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

  // Socket Channel Names
  const roomChannel = 'refocus.room.settings';
  const bdChannel = 'refocus.bot.data';
  const baChannel = 'refocus.bot.actions';
  const eventChannel = 'refocus.events';

  // Once connected to refocus display bots
  socket.on('connect', () => {
    debugMessage('Socket Connected');
    // If disconnected delete old bots
    bots.forEach((bot) => {
      if (document.getElementById(bot.body.name + '-section')) {
        document.getElementById(bot.body.name + '-section').remove();
      }
    });

    // Add bots to page
    bots.forEach((bot, i) => {
      displayBot(bot.body, i);
    });
  });

  // Room Setting Updated
  socket.on(settingsChangedEventName, (data) => {
    const eventData = JSON.parse(data);
    const room = eventData[settingsChangedEventName];
    if (room.id === parseInt(ROOM_ID, 10)) {
      debugMessage('Setting Changed', room);
      Object.keys(botInfo).forEach((key) => {
        createIframeEvent(roomChannel, room, botInfo, key);
      });
    }
  });

  // Bot Action Updated
  socket.on(botActionsUpdate, (data) => {
    const eventData = JSON.parse(data);
    const action = eventData[botActionsUpdate];
    if (action.new.roomId === parseInt(ROOM_ID, 10)) {
      debugMessage('BotActions Updated', action);
      createIframeEvent(baChannel, action, botInfo);
    }
  });

  // Bot Data Added
  socket.on(botDataAdd, (data) => {
    const eventData = JSON.parse(data);
    const bd = eventData[botDataAdd];
    if (bd.roomId === parseInt(ROOM_ID, 10)) {
      debugMessage('BotData Added', bd);
      createIframeEvent(bdChannel, bd, botInfo);
    }
  });

  // Bot Data Updated
  socket.on(botDataUpdate, (data) => {
    const eventData = JSON.parse(data);
    const bd = eventData[botDataUpdate];
    if (bd.new.roomId === parseInt(ROOM_ID, 10)) {
      debugMessage('BotData Updated', bd);
      createIframeEvent(bdChannel, bd, botInfo);
    }
  });

  // Events Added
  socket.on(botEventAdd, (data) => {
    const eventData = JSON.parse(data);
    const events = eventData[botEventAdd];
    if (events.roomId === parseInt(ROOM_ID, 10)) {
      debugMessage('Events Added', events);
      Object.keys(botInfo).forEach((key) => {
        createIframeEvent(eventChannel, events, botInfo, key);
      });

      if (events.context) {
        if (events.context.type === 'RoomState') {
          activeToggle.dispatchEvent(new CustomEvent('refocus.events', {
            detail: events,
          }));
        }
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

  confirmationText.innerText =
    `Would you like to ${_isActive ? 'deactivate' : 'activate'} this room?`;
}

/**
 * Closes the confirmation modal
 */
function closeConfirmationModal() {
  confirmationModal.setAttribute(
    'style',
    'display:none;'
  );
}

/**
 * The room state has changed so it needs to be updated.
 *
 * @returns {Promise} For use in chaining.
 */
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

    const message = _isActive ? 'Room Activated' : 'Room Deactivated';

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

    return u.postPromiseWithUrl(GET_EVENTS, events);
  });
}

/**
 * Handles events that have been triggered
 *
 * @param  {Object} event - Event that was triggered.
 */
function handleEvents(event) {
  if (event.detail.context.type === 'RoomState') {
    event.target.checked = event.detail.context.active;
    _isActive = event.detail.context.active;
    event.target.disabled = false;
  }
}

// Setting up columns so bots can be moved between them.
function setupColumns() {
  ghostBot = document.createElement('div');
  dummyBot = document.createElement('div');
  const img = document.createElement('img');
  img.className = 'bot-img';
  img.src = BOT_LOGO;
  ghostBot.className = 'ghost-bot';
  const ghostBotInside = document.createElement('div');
  ghostBotInside.className = 'internal-ghost-bot';
  ghostBotInside.appendChild(img);
  ghostBot.appendChild(ghostBotInside);
  dummyBot.className = 'dummy-bot';

  botsContainerColumns.forEach((c) => {
    c.addEventListener('drop', (e) => {
      drop(e, c);
    });

    c.addEventListener('dragover', () => {
      dragOverColumnHandler(c);
    });
  });

  ghostBot.addEventListener('dragover', (e) => {
    allowBotDropHandler(e, ghostBot);
  });

  dummyBot.addEventListener('dragover', (e) => {
    allowBotDropHandler(e, dummyBot);
  });
}

window.onload = () => {
  activeToggle.addEventListener('click', toggleConfirmationModal);
  activeToggle.addEventListener('refocus.events', handleEvents, false);
  confirmButton.onclick = roomStateChanged;
  declineButton.onclick = closeConfirmationModal;
  setupColumns();

  // Note: this is declared in index.pug:
  _io = io;
  _user = JSON.parse(user.replace(/&quot;/g, '"'));
  let room;

  u.getPromiseWithUrl(GET_ROOM)
  .then((res) => {
    const response = Array.isArray(res.body) ? res.body[0] : res.body;

    if (response === undefined) {
      window.location.replace(`/rooms/new/${ROOM_ID}`);
    }

    if (parseInt(ROOM_ID, 10) !== response.id) {
      window.location.replace(`/rooms/${response.id}`);
    }

    uPage.setTitle(`Room # ${ROOM_ID}`);
    _roomName = response.name;
    _isActive = response.active;
    activeToggle.checked = _isActive;
    room = res.body;
    return u.getPromiseWithUrl(GET_ROOMTYPES + '/' + response.type);
  })
  .then((res) => {
    uPage.setSubtitle(`${_roomName} - ${res.body.name}`);
    const promises = room.bots.map((botName) =>
      u.getPromiseWithUrl(GET_BOTS + '/' + botName));
    return Promise.all(promises);
  })
  .then((res) => {
    setupSocketIOClient(res);
    uPage.removeSpinner();
  });
};

//for testing
module.exports = () => {
  return {
    parseBot,
    iframeBot
  };
};
