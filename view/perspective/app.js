/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/perspective/app.js
 *
 * When this page is loaded, we call "getPerspectiveNames" to load all the
 * perspective names to populate the dropdown.
 * If there are no perspectives, we just render the perspective overlay over an
 * empty page.
 * If there are perspectives, we call "whichPerspective" to figure out which
 * perspective to load.
 * If it's not in the URL path, either use the DEFAULT_PERSPECTIVE from global
 * config OR the first perspective from the list of perspective names
 * (alphabetical order), and redirect to the URL using *that* perspective name.
 * Once we can identify the perspective in the URL path, we call
 * "getPerspective" to load the specified perspective. When we get the
 * perspective back from the server, we perform all of this async work in
 * parallel:
 * (1) call "setupSocketIOClient" to initialize the socket.io client
 * (2) call "getHierarchy" to request the hierarchy
 * (3) call "getLensPromise" to request the lens library
 * (4) call "loadPerspective" to start rendering the perspective-picker
 *     component
 * (5) call "loadExtraStuffForCreatePerspective" to start loading all the extra
 *     data we'll need for the "CreatePerspective" component
 *
 * If config var "realtimeEventThrottleMilliseconds" > 0, we start a timer to
 * flush the realtime event queue on that defined interval.
 *
 * Whenever we get the response back with the lens, we dispatch the lens.load
 * event to the lens.
 *
 * Whenever we get the response back with the hierarchy, we dispatch the
 * lens.hierarchyLoad event to the lens. (If we happen to get the hierarchy
 * back *before* the lens, hold onto it, wait for the lens, *then* dispatch the
 * lens.hierarchyLoad event *after* the lens.load event.)
 *
 * Whenever we get all the extra data we need for "CreatePerspective", we
 * re-render the perspective-picker component.
 */
import request from 'superagent';
import React from 'react';
import ReactDOM from 'react-dom';
import PerspectiveController from './PerspectiveController';
import { getValuesObject } from './utils';
const u = require('../utils');
const pu = require('./utils');
const constants = require('../constants');
const eventsQueue = require('./eventsQueue');
const emitUtils = require('../../realtime/emitUtils');
const pcValues = {};
const ZERO = 0;
const ONE = 1;
const DEBUG_REALTIME = window.location.href.split(/[&\?]/)
  .includes('debug=REALTIME');
const REQ_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest',
  Expires: '-1',
  'Cache-Control': 'no-cache,no-store,must-revalidate,max-age=-1,private',
};
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred.';
const LENS_LIBRARY_REX = /(?:\.([^.]+))?$/;

// Some API endpoints...
const GET_DEFAULT_PERSPECTIVE = '/v1/globalconfig/DEFAULT_PERSPECTIVE';
const GET_PERSPECTIVE_NAMES = '/v1/perspectives?fields=name';

// Some divs on the perspective page...
const LENS_DIV = document.getElementById('lens');
const ERROR_INFO_DIV = document.getElementById('errorInfo');
const PERSPECTIVE_CONTAINER =
  document.getElementById('refocus_perspective_dropdown_container');
const SPINNER_ID = 'lens_loading_spinner';

let _realtimeApplication;
let _realtimeEventThrottleMilliseconds;
let _userSession;
let _io;

let minAspectTimeout;
let minTimeoutCount;
let maxAspectTimeout;
let lastUpdateTime;
let intervalId;
let lensEventApiVersion = 1;

const trackedAspects = {};

/**
 * Add error message to the errorInfo div in the page.
 * Remove the spinner.
 *
 * @param {Object} err - The error object
 */
function handleError(err) {
  let msg = DEFAULT_ERROR_MESSAGE;
  if (err.response.body.errors[ZERO].description) {
    msg = err.response.body.errors[ZERO].description;
  }

  ERROR_INFO_DIV.innerHTML = msg;
  u.removeSpinner(SPINNER_ID);
} // handleError

/**
 * Handle event data, push the event data to the event queue.
 *
 * @param  {String} eventData - Data recieved with event
 * @param  {String} eventTypeName - Event type
 * @param  {Function} trackEndToEndTime - Callback to send event receipt time back to server
 */
function handleEvent(eventData, eventTypeName, trackEndToEndTime) {
  trackEndToEndTime && trackEndToEndTime(Date.now());

  const obj = JSON.parse(eventData)[eventTypeName];
  if (DEBUG_REALTIME) {
    console.log({ // eslint-disable-line no-console
      handleEventTimestamp: new Date(),
      eventData: obj,
    });
  }

  // intercept events to support v1 lenses, and track timeouts for auto-reload.
  interceptEvent(eventTypeName, obj);

  eventsQueue.enqueueEvent(eventTypeName, obj);
  if (_realtimeEventThrottleMilliseconds === ZERO) {
    eventsQueue.createAndDispatchLensEvent(eventsQueue.queue, LENS_DIV);
    eventsQueue.queue.length = ZERO;
  }
} // handleEvent

/**
 * Intercept events. Attach aspects to support v1 lenses, and track timeouts
 * for auto-reload.
 *
 * @param  {String} eventTypeName - Event type
 * @param  {Object} eventData - object that will be sent to the lens
 */
function interceptEvent(eventTypeName, eventData) {
  if (lensEventApiVersion < 2) {
    if (eventTypeName === eventsQueue.eventType.INTRNL_SMPL_ADD) {
      eventData.aspect = getTrackedAspect(eventData);
    } else if (eventTypeName === eventsQueue.eventType.INTRNL_SMPL_DEL) {
      eventData.aspect = getTrackedAspect(eventData);
    } else if (eventTypeName === eventsQueue.eventType.INTRNL_SMPL_UPD) {
      eventData.new.aspect = getTrackedAspect(eventData.new);
    } else if (eventTypeName === eventsQueue.eventType.INTRNL_ASP_ADD) {
      trackedAspects[eventData.name] = eventData;
      updateTimeoutValues(eventData.timeout);
    } else if (eventTypeName === eventsQueue.eventType.INTRNL_ASP_DEL) {
      delete trackedAspects[eventData.name];
      updateDeletedTimeoutValues(eventData.timeout);
    } else if (eventTypeName === eventsQueue.eventType.INTRNL_ASP_UPD) {
      trackedAspects[eventData.new.name] = eventData.new;
      updateTimeoutValues(eventData.new.timeout);
    }
  }
}

/**
 * Get the tracked aspect for the given sample
 * @param {Object} sample - sample object
 */
function getTrackedAspect(sample) {
  const [absPath, aspName] = sample.name.split('|');
  return trackedAspects[aspName];
}

/**
 * Setup the socket.io client to listen to a namespace, where the namespace is
 * named for the root subject of the perspective.
 *
 * @param  {Object} persBody - Perspective object
 */
function setupSocketIOClient(persBody) {
  if (!persBody) {
    throw new Error('Cannot set up socket IO client without a perspective');
  }

  /*
   * Add the perspective name as a query param so that it's available server-
   * side on connect.
   */
  let socket;
  if (useNewNamespaceFormat) {
    const options = {
      query: {
        p: persBody.name,
        id: u.getNamespaceString('/', persBody),
      },
      ...constants.socketOptions,
    };

    const namespace = _realtimeApplication.endsWith('/') ? 'perspectives' : '/perspectives';
    socket = _io.connect(`${_realtimeApplication}${namespace}`, options)
             .on('connect', function() {
               this.emit('auth', _userSession);
             })
             .on('auth error', (err) =>
               console.error('Socket auth error:', err)
             );
  } else {
    const namespace = u.getNamespaceString(_realtimeApplication, persBody) +
      `?p=${persBody.name}&t=${_userSession}`;
    socket = _io.connect(namespace, constants.socketOptions);
  }
  socket.on('connect', () => {
    Object.values(eventsQueue.eventType).forEach((eventType) =>
      socket.on(eventType, (data, cb) => handleEvent(data, eventType, cb))
    );

    /*
     * TODO once we build new perspective page, we should have a way to tell
     *      the user that they have been disconnected from the real-time event
     *      stream. In the meantime, just log it in the browser.
     */
    socket.on('disconnect', (msg) => {
      console.log('Disconnected from real-time event stream.');
    });
  });
} // setupSocketIOClient

/**
 * Create style tag for lens css file.
 * @param  {Object} library From the the lens api
 * @param  {String} filename   name of file in lens library
 */
function injectStyleTag(library, filename) {
  const style = document.createElement('style');
  style.type = 'text/css';

  const t = document.createTextNode(library[filename]);
  style.appendChild(t);
  const head = document.head ||
   document.getElementsByTagName('head')[ZERO];

  if (style.styleSheet) {
    style.styleSheet.cssText = library[filename];
  } else {
    style.appendChild(document.createTextNode(library[filename]));
  }

  head.appendChild(style);
} // injectStyleTag

/**
 * Create DOM elements for each of the files in the lens library.
 *
 * @param {Object} lib - Library of the response from lens api call
 */
function handleLibraryFiles(lib) {
  const lensScript = document.createElement('script');
  for (const filename in lib) {
    const ext = (LENS_LIBRARY_REX.exec(filename)[ONE] || '').toLowerCase();
    if (filename === 'lens.js') {
      lensScript.appendChild(document.createTextNode(lib[filename]));
    } else if (ext === 'css') {
      injectStyleTag(lib, filename);
    } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
      const image = new Image();
      image.src = 'data:image/' + ext + ';base64,' + lib[filename];
      document.body.appendChild(image);
    } else if (ext === 'js') {
      const s = document.createElement('script');
      s.appendChild(document.createTextNode(lib[filename]));
      document.body.appendChild(s);
    }
  }

  /*
   * Note: this 'lens.js' script should always get added as the LAST script
   * since it may reference things defined in the other scripts.
   */
  document.body.appendChild(lensScript);
} // handleLibraryFiles

/**
 * Setup the aspect timeout check. If the lens has already been loaded,
 * dispatch the "hierarchyLoad" event. If not, return the hierarchyLoad event.
 *
 * @param {Object} hierarchy - hierarchy response
 * @param {Object} allAspects - aspects response
 * @param {Object} perspective - perspective object
 * @param {Boolean} gotLens
 * @returns {CustomEvent} if lens is received, return undefined,
 * else return hierarchyLoadEvent.
 */
function handleHierarchyEvent(hierarchy, allAspects, perspective, gotLens) {
  let eventDetail;

  // filter aspects based on perspective filters
  const nspStr = emitUtils.getPerspectiveNamespaceString(perspective);
  const aspects = allAspects.filter((asp) =>
    emitUtils.shouldIEmitThisObj(nspStr, asp)
  );

  // setup aspect timeouts
  setupAspectTimeout(aspects);

  // track aspects to be used for intercepting v1 events
  aspects.forEach((asp) =>
    trackedAspects[asp.name] = asp
  );

  // set event detail
  if (lensEventApiVersion < 2) {
    eventDetail = pu.reconstructV1Hierarchy(hierarchy, aspects);
  } else {
    eventDetail = { hierarchy, aspects };
  }

  const hierarchyLoadEvent = new window.CustomEvent(
    'refocus.lens.hierarchyLoad', { detail: eventDetail });

  /*
   * The order of events matters so only dispatch the hierarchyLoad event if
   * we received the lens response back.
   */
  if (gotLens) {
    LENS_DIV.dispatchEvent(hierarchyLoadEvent);
    return;
  }

  /*
   * Lens not here yet. Return the hierarchyLoad event--it will be dispatched
   * from getLens once the lens arrives.
   */
  return hierarchyLoadEvent;
}

/**
 * Initialize the aspect timeout values, then setup
 * an interval to check that the page is still receiving events.
 *
 * @param {Object} aspects - List of aspects
 */
function setupAspectTimeout(aspects) {
  lastUpdateTime = Date.now();
  minAspectTimeout = Infinity;
  minTimeoutCount = 0;
  maxAspectTimeout = 0;

  aspects.forEach((aspect) =>
    updateTimeoutValues(aspect.timeout)
  );

  if (minAspectTimeout < Infinity) {
    setupTimeoutInterval();
  }
}

/**
 * Setup an interval to check that the page is still receiving events. Do a
 * reload if not. If there is an existing interval, clear it and set a new one
 * based on the current value of minAspectTimeout
 */
function setupTimeoutInterval() {
  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = setInterval(() => {
    if (Date.now() - lastUpdateTime > minAspectTimeout * 2) {
      window.location.reload();
    }
  }, minAspectTimeout);
}

/**
 * Check if the aspect timeout values need to be updated when a sample is
 * added or updated.
 * @param {String} timeoutString - a timeout string from a sample
 */
function updateTimeoutValues(timeoutString) {
  lastUpdateTime = Date.now();
  const timeout = parseTimeout(timeoutString);

  if (timeout === minAspectTimeout) {
    minTimeoutCount++;
  }

  if (timeout < minAspectTimeout) {
    minAspectTimeout = timeout;
    minTimeoutCount = 1;
    setupTimeoutInterval();
  }

  if (timeout > maxAspectTimeout) {
    maxAspectTimeout = timeout;
  }
}

/**
 * Check if the aspect timeout values need to be updated when a sample is
 * deleted.
 * @param {String} timeoutString - a timeout string from a sample
 */
function updateDeletedTimeoutValues(timeoutString) {
  lastUpdateTime = Date.now();
  const timeout = parseTimeout(timeoutString);

  if (timeout === minAspectTimeout) {
    if (minTimeoutCount === 1) {
      // reset. It will settle to the correct value as more events come in.
      minAspectTimeout = maxAspectTimeout;
      setupTimeoutInterval();
    } else {
      minTimeoutCount--;
    }
  }
}

/**
 * Parse a timeout string and convert it into ms.
 * @param {String} timeoutString - a timeout string from a sample
 * @returns {Number} the sample timeout in ms
 */
function parseTimeout(timeoutString) {
  let timeout = timeoutString.slice(0, -1) * 1000;
  const unit = timeoutString.slice(-1).toLowerCase();
  switch (unit) {
    case 'm':
      timeout *= 60;
      break;
    case 'h':
      timeout *= 3600;
      break;
    case 'd':
      timeout *= 86400;
      break;
  }

  return timeout;
}

/**
 * On receiving the lens, load the lens.
 * Load the hierarchy if hierarchy event is passed in.
 *
 * @param {Object} library the perspective's lens's library
 * @param {Object} hierarchyLoadEvent undefined or
 * a Custom Event
 */
function handleLensDomEvent(lensEventApiVer, library, hierarchyLoadEvent) {
  handleLibraryFiles(library); // inject lens library files in perspective view
  setLensEventApiVersion(lensEventApiVer); // save lens event api version
  u.removeSpinner(SPINNER_ID);

  /*
   * Load the lens. Pass userId from cookie through to the lens, in case the
   * lens wants to do any analytics by userId.
   */
  const lensLoadEvent = new window.CustomEvent('refocus.lens.load', {
    detail: {
      userId: u.getCookie('userId'),
    },
  });
  LENS_DIV.dispatchEvent(lensLoadEvent);

  /*
   * The order of events matters so if we happened to have gotten the
   * hierarchy *before* the lens, then dispatch the lens.hierarchyLoad event
   * now.
   */
  if (hierarchyLoadEvent) {
    LENS_DIV.dispatchEvent(hierarchyLoadEvent);
  }
} // handleLensDomEvent

/**
 * Returns the default url if page url ends with /perspectives
 * Else the perspective name is in url:
 * - change the document title to the name of the perspective.
 * - return nothing
 *
 * @returns {String} if on/perspectives page, return default url.
 * Else returns nothing
 */
function getPerspectiveUrl() {
  let h = window.location.pathname;
  let hsplit = h.split('/');
  let p = hsplit.pop();

  // named perspective
  if (p && p !== 'perspectives') {
    document.title += ' - ' + p;
    return { url: '/v1/perspectives/' + p, named: true };
  } else {
    const object = { named: false };
    object.url = GET_DEFAULT_PERSPECTIVE;
    return object;
  }
} // whichPerspective

window.onload = () => {
  // Note: these are declared in perspective.pug:
  _realtimeApplication = realtimeApplication;
  _realtimeEventThrottleMilliseconds = realtimeEventThrottleMilliseconds;
  _userSession = userSession;
  _io = io;

  if (_realtimeEventThrottleMilliseconds !== ZERO) {
    eventsQueue.scheduleFlushQueue(LENS_DIV, _realtimeEventThrottleMilliseconds);
  }

  const accumulatorObject = {
    getPromiseWithUrl: u.getPromiseWithUrl,
    getPerspectiveUrl,
    handleHierarchyEvent,
    handleLensDomEvent,
    customHandleError: (msg) => {
      ERROR_INFO_DIV.innerHTML = msg;
      u.removeSpinner(SPINNER_ID);
    },
    setupSocketIOClient,
    redirectToUrl: (url) => window.location.href = url,
  };

  getValuesObject(accumulatorObject)
  .then((valuesObject) => {

    // skip loading the controller if nothing is returned
    if (valuesObject) {
      loadController(valuesObject);
    }
  })
  .catch((error) => {
    document.getElementById('errorInfo').innerHTML = error;
  });
};

/**
 * Passes data on to Controller to pass onto renderers.
 *
 * @param {Object} values Data returned from AJAX.
 */
function loadController(values) {
  ReactDOM.render(<PerspectiveController values={ values } />,
    PERSPECTIVE_CONTAINER);
}

// For Testing
function getTimeoutValues() {
  return {
    minAspectTimeout,
    minTimeoutCount,
    maxAspectTimeout,
    lastUpdateTime,
    intervalId,
  };
}

function setLensEventApiVersion(version) {
  lensEventApiVersion = version;
}

module.exports = {
  getTimeoutValues,
  handleEvent,
  parseTimeout,
  setupAspectTimeout,
  setupTimeoutInterval,
  exportForTesting: {
    handleHierarchyEvent,
    setLensEventApiVersion,
    eventsQueue,
  },
};
