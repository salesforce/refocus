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
import { getFilterQuery, getTagsFromResources, getValuesObject } from './utils';
const u = require('../utils');
const eventsQueue = require('./eventsQueue');
let gotLens = false;
const lensLoadEvent = new CustomEvent('refocus.lens.load');
let hierarchyLoadEvent;
const pcValues = {};
const ZERO = 0;
const ONE = 1;
const DEBUG_REALTIME = window.location.href.split(/[&\?]/)
  .includes('debug=REALTIME');
const WEBSOCKET_ONLY = window.location.href.split(/[&\?]/)
  .includes('protocol=websocket');
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

// Note: these are declared in perspective.pug:
const _realtimeEventThrottleMilliseconds =
  realtimeEventThrottleMilliseconds;  // eslint-disable-line no-undef
const _transProtocol = transProtocol; // eslint-disable-line no-undef
const _io = io; // eslint-disable-line no-undef

/**
 * Add error message to the errorInfo div in the page.
 *
 * @param {Object} err - The error object
 */
function handleError(err) {
  let msg = DEFAULT_ERROR_MESSAGE;
  if (err.response.body.errors[ZERO].description) {
    msg = err.response.body.errors[ZERO].description;
  }

  ERROR_INFO_DIV.innerHTML = msg;
} // handleError

/**
 * Handle event data, push the event data to the event queue.
 *
 * @param  {String} eventData - Data recieved with event
 * @param  {String} eventTypeName - Event type
 */
function handleEvent(eventData, eventTypeName) {
  const j = JSON.parse(eventData);
  if (DEBUG_REALTIME) {
    console.log({ // eslint-disable-line no-console
      handleEventTimestamp: new Date(),
      eventData: j,
    });
  }

  eventsQueue.enqueueEvent(eventTypeName, j[eventTypeName]);
  if (_realtimeEventThrottleMilliseconds === ZERO) {
    eventsQueue.createAndDispatchLensEvent(eventsQueue.queue, LENS_DIV);
    eventsQueue.queue.length = ZERO;
  }
} // handleEvent

/**
 * Setup the socket.io client to listen to a namespace, where the namespace is
 * named for the root subject of the perspective.
 *
 * @param  {Object} persBody - Perspective object
 */
function setupSocketIOClient(persBody) {
  /*
   * Add the perspective name as a query param so that it's available server-
   * side on connect.
   */
  const namespace = u.getNamespaceString(persBody) +
    `?p=${persBody.name}`;

  /*
   * If transProtocol is set, initialize the socket.io client with the
   * transport protocol options. The "options" object is used to set the
   * transport type. For example, to specify websockets as the only transport
   * protocol, the options object will be { transports: ['websocket'] }.
   * The regex is used to trim whitespace from around any commas in the
   * clientProtocol string. Finally, we split the comma-seperated values into
   * an array.
   */
  const options = {};
  if (_transProtocol) {
    options.transports = _transProtocol.replace(/\s*,\s*/g, ',').split(',');
  }

  let socket;
  if (WEBSOCKET_ONLY) {
    socket = _io(namespace, { transports: ['websocket'] });
  } else {
    socket = _io(namespace, options);
  }

  socket.on(eventsQueue.eventType.INTRNL_SUBJ_ADD, (data) => {
    handleEvent(data, eventsQueue.eventType.INTRNL_SUBJ_ADD);
  });
  socket.on(eventsQueue.eventType.INTRNL_SUBJ_DEL, (data) => {
    handleEvent(data, eventsQueue.eventType.INTRNL_SUBJ_DEL);
  });
  socket.on(eventsQueue.eventType.INTRNL_SUBJ_UPD, (data) => {
    handleEvent(data, eventsQueue.eventType.INTRNL_SUBJ_UPD);
  });
  socket.on(eventsQueue.eventType.INTRNL_SMPL_ADD, (data) => {
    handleEvent(data, eventsQueue.eventType.INTRNL_SMPL_ADD);
  });
  socket.on(eventsQueue.eventType.INTRNL_SMPL_DEL, (data) => {
    handleEvent(data, eventsQueue.eventType.INTRNL_SMPL_DEL);
  });
  socket.on(eventsQueue.eventType.INTRNL_SMPL_UPD, (data) => {
    handleEvent(data, eventsQueue.eventType.INTRNL_SMPL_UPD);
  });
} // setupSocketIOClient

/**
 * Create style tag for lens css file.
 * @param  {Object} lensResponse Response from lens api
 * @param  {String} filename   name of file in lens library
 */
function injectStyleTag(lensResponse, filename) {
  const style = document.createElement('style');
  style.type = 'text/css';

  const t = document.createTextNode(lensResponse.body.library[filename]);
  style.appendChild(t);
  const head = document.head ||
   document.getElementsByTagName('head')[ZERO];

  if (style.styleSheet) {
    style.styleSheet.cssText = lensResponse.body.library[filename];
  } else {
    style.appendChild(
      document.createTextNode(lensResponse.body.library[filename])
    );
  }

  head.appendChild(style);
} // injectStyleTag

/**
 * Create DOM elements for each of the files in the lens library.
 *
 * @param {Object} lensObject - Body of the response from lens api call
 */
function handleLibraryFiles(lensObject) {
  const lib = lensObject.library;
  const lensScript = document.createElement('script');
  for (const filename in lib) {
    const ext = (LENS_LIBRARY_REX.exec(filename)[ONE] || '').toLowerCase();
    if (filename === 'lens.js') {
      lensScript.appendChild(document.createTextNode(lib[filename]));
    } else if (ext === 'css') {
      injectStyleTag(res, filename);
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
 * @param {String} url The url to get from
 * @returns {Promise} For use in chaining.
 */
function getPromiseWithUrl(url) {
  return new Promise((resolve, reject) => {
    request.get(url)
    .set(REQ_HEADERS)
    .end((error, response) => {
      // reject if error is present, otherwise resolve request
      if (error) {
        document.getElementById('errorInfo').innerHTML += 'Failed to GET ' +
          url + '. Make sure the path is valid and the resource is published.';
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
} // getPromiseWithUrl

/**
 * Figure out which perspective to load. If it's in the URL path, load that
 * one.
 * If it's not in the URL path, either use the DEFAULT_PERSPECTIVE from global
 * config OR the first perspective from the list of perspective names
 * (alphabetical order), and redirect to the URL using that perspective name.
 *
 * @param {Array} pnames - Array of perspective names
 * @returns {String} perspectiveName - The named perspective
 */
function whichPerspective(pnames) {
  let h = window.location.pathname;
  let hsplit = h.split('/');
  let p = hsplit.pop();

  // named perspective
  if (p && p !== 'perspectives') {

    // check if name is valid
    if (pnames.indexOf(p) < 0) {
      const errMessage = 'Did not find perspective ' + p;
      throw new Error(errMessage);
    }

    document.title += ' - ' + p;
    return p;
  } else {

    // find name of perspective
    const name = pnames.length ? pnames.shift() : GET_DEFAULT_PERSPECTIVE;
    window.location.href = '/perspectives/' + name;
    return name;
  }
} // whichPerspective

window.onload = () => {
  getValuesObject(getPromiseWithUrl, whichPerspective)
  .then((obj) => {

    // synchronous events
    setupSocketIOClient(obj.perspective);

    // inject lens library files in perspective view.
    handleLibraryFiles(obj.lens); // synchronous

    // remove spinner and load lens
    const spinner = document.getElementById('lens_loading_spinner');
    spinner.parentNode.removeChild(spinner);

    // trigger refocus.lens.load event
    LENS_DIV.dispatchEvent(lensLoadEvent);

    hierarchyLoadEvent = new CustomEvent('refocus.lens.hierarchyLoad', {
      detail: obj.rootSubject,
    });

    LENS_DIV.dispatchEvent(hierarchyLoadEvent);
    loadController(obj);
  })
  .catch((error) => {
    document.getElementById('errorInfo').innerHTML += error;
  });
};

if (_realtimeEventThrottleMilliseconds !== ZERO) {
  eventsQueue.scheduleFlushQueue(LENS_DIV, _realtimeEventThrottleMilliseconds);
}

/**
 * Passes data on to Controller to pass onto renderers.
 *
 * @param {Object} values Data returned from AJAX.
 */
function loadController(values) {
  ReactDOM.render(
    <PerspectiveController
      values={ values }
    />,
    PERSPECTIVE_CONTAINER
  );
}

