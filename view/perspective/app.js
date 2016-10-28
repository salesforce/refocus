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
 * If config var "eventThrottleMillis" > 0, we start a timer to flush the
 * realtime event queue on that defined interval.
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
const u = require('../utils');
const eventsQueue = require('./eventsQueue');
let gotLens = false;
const lensLoadEvent = new CustomEvent('refocus.lens.load');
let hierarchyLoadEvent;
const pcValues = {};

// TODO get rid of this once all the lenses aren't using it
require('./lensUtils');

const ZERO = 0;
const ONE = 1;

const DEBUG_REALTIME = window.location.href.split(/[&\?]/)
  .includes('debug=REALTIME');
const WEBSOCKET_ONLY = window.location.href.split(/[&\?]/)
  .includes('protocol=websocket');

const REQ_HEADERS = {
  Authorization: u.getCookie('Authorization'),
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

// Note: realtimeEventThrottleMilliseconds is defined in perspective.pug
const eventThrottleMillis = realtimeEventThrottleMilliseconds;

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
  if (eventThrottleMillis === ZERO) {
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
  const namespace = u.getNamespaceString(persBody);

  /*
   * if the transprotocol is set, initialize the socketio client with
   *  the transport protocol options. The transProtocol variable is set in
   *  perspective.pug
   */
  const options = {};
  const clientProtocol = transProtocol;
  if (clientProtocol) {
    /*
     * options is used here to set the transport type. For example to only use
     * websockets as the transport protocol the options object will be
     * { transports: ['websocket'] }. The regex is used to trim the white spaces
     * and since clientProtocol is a string of comma seperated values,
     * the split function is used to split them out by comma and convert
     * it to an array.
     */
    options.transports = clientProtocol.replace(/\s*,\s*/g, ',').split(',');
  }

  /*
   * Note: The "io" variable is defined by the "/socket.io.js" script included
   * in perspective.pug.
   */
  let socket;
  if (WEBSOCKET_ONLY) {
    socket = io(namespace, { transports: ['websocket'] });
  } else {
    socket = io(namespace, options);
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
 * @param {Object} res - Response from lens api call
 */
function handleLibraryFiles(res) {
  const lib = res.body.library;
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
 * Generate the filter string for the hierarchy API GET.
 *
 * @param {Object} p - The perspective object
 * @returns {String} - The query string created generated based on the
 *  perspective filters
 */
function getFilterQuery(p) {
  let q = '?';
  if (p.aspectFilter && p.aspectFilter.length) {
    const sign = p.aspectFilterType === 'INCLUDE' ? '=' : '=-';
    q += 'aspect' + sign + p.aspectFilter.join();
  }

  if (p.aspectTagFilter && p.aspectTagFilter.length) {
    if (!q.endsWith('?')) {
      q += '&';
    }

    const sign = p.aspectTagFilterType === 'INCLUDE' ? '=' : '=-';
    q += 'aspectTags' + sign + p.aspectTagFilter.join();
  }

  if (p.subjectTagFilter && p.subjectTagFilter.length) {
    if (!q.endsWith('?')) {
      q += '&';
    }

    const sign = p.subjectTagFilterType === 'INCLUDE' ? '=' : '=-';
    q += 'subjectTags' + sign + p.subjectTagFilter.join();
  }

  if (p.statusFilter) {
    if (!q.endsWith('?')) {
      q += '&';
    }

    const sign = p.statusFilterType === 'INCLUDE' ? '=' : '=-';
    q += 'status' + sign + p.statusFilter.join();
  }

  return q;
} // getFilterQuery

/**
 * @param {String} name The key to the returned response object
 * @param {String} url The url to get from
 * param {Function} callback Additional processing with result
 * @returns {Promise} For use in chaining.
 */
function getPromiseWithUrl(name, url, callback) {
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
        if (callback) {
          callback(response); // pass in the complete result
        }
        const obj = name ? { name: name, res: response.body } : response.body;
        resolve(obj);
      }
    });
  });
} // getHierarchyData

/**
 * Given the rootSubject, gets subject hierarchy
 * and returns a promise to load rootSubject
 *
 * @param {String} rootSubject The subject to load the hierarchy of
 * @param {String} filterString Any filters
 * @returns {Promise} which resolves once we receive the hierarchy
 */
function getHierarchy(rootSubject, filterString) {
  const apiPath = `/v1/subjects/${rootSubject}/hierarchy` +
    (filterString || '');
  return getPromiseWithUrl('rootSubject', apiPath, (res) => {
    hierarchyLoadEvent = new CustomEvent('refocus.lens.hierarchyLoad', {
      detail: res.body,
    });

    /*
     * The order of events matters so only dispatch the hierarchyLoad event if
     * we ahve already gotten the lens response back. If hierarchy happens to
     * have come back first, then it will be dispatched from getLensPromise.
     */
    if (gotLens) {
      LENS_DIV.dispatchEvent(hierarchyLoadEvent);
    }
  });
} // getHierarchy

/**
 * @param {String} lensNameOrId
 * @returns {Promise} which resolves once we receive the lens
 */
function getLensPromise(lensNameOrId) {
  const apiPath = `/v1/lenses/${lensNameOrId}`;
  return getPromiseWithUrl('lens', apiPath, (res) => {
    // inject lens library files in perspective view.
    handleLibraryFiles(res);

    // remove spinner and load lens
    const spinner = document.getElementById('lens_loading_spinner');
    spinner.parentNode.removeChild(spinner);

    // trigger refocus.lens.load event
    gotLens = true;
    LENS_DIV.dispatchEvent(lensLoadEvent);

    /*
     * The order of events matters so if we happened to have gotten the
     * hierarchy *before* the lens, then dispatch the lens.hierarchyLoad event
     * now.
     */
    if (hierarchyLoadEvent) {
      LENS_DIV.dispatchEvent(hierarchyLoadEvent);
    }
  });
} // getLensPromise

/**
 * Any last additions to show on create and detail view
 * @returns {Object} The object with data from queryParam
 */
function getAllParams() {
  const responseObject = {};
  const { rootSubject, lens } = queryParams; // defined in pug file
  responseObject.subjects = rootSubject || ''; // single
  responseObject.lenses = lens || ''; // single
  // multiples, may start with -. If so, use exclude filter
  const filterA = [
    'aspectFilter', 'aspectTagFilter', 'subjectTagFilter', 'statusFilter',
  ];
  for (let i = filterA.length - ONE; i >= ZERO; i--) {
    const currentVal = queryParams[filterA[i]];
    if (currentVal) {
      if (currentVal.slice(ZERO, ONE) === '-') {
        responseObject[filterA[i] + 'Type'] = 'EXCLUDE';
        responseObject[filterA[i]] = currentVal.slice(ONE).split(',');
      } else { // filter exists, and is an include
        responseObject[filterA[i] + 'Type'] = 'INCLUDE';
        responseObject[filterA[i]] = currentVal.split(',');
      }
    } else { // filter is empty or is not in params
      responseObject[filterA[i] + 'Type'] = 'INCLUDE';
      responseObject[filterA[i]] = [];
    }
  }

  return responseObject;
} // getAllParams

/**
 * Returns array of objects with tags
 * @param {Array} array The array of reosurces to get tags from.
 * @returns {Object} array of tags
 */
function getTagsFromResources(array) {
  // get all tags
  const allTags = [];
  array.map((obj) => {
    if (obj.tags.length) {
      allTags.push(...obj.tags);
    }
  });
  const tagNames = [];

  // get through tags, get all names
  allTags.map((tagObj) => {
    if (tagNames.indexOf(tagObj.toLowerCase()) === -1) {
      tagNames.push(tagObj);
    }
  });
  return tagNames;
}

function getPublishedObjectsbyField(array, field) {
  return array.filter((obj) =>
   obj.isPublished).map((obj) => obj[field])
}

/**
 * @param {Object} perspective An object
 */
function loadPerspective(perspective, params) {
  pcValues.name = perspective.name;
  const stateObject = Object.assign(
    { perspectives: perspective ? perspective.name : '' },
    params
  );
  getPromiseWithUrl('perspectives', '/v1/perspectives')
  .then((values) => {
    pcValues.perspectives = values.res;
    loadController(pcValues, stateObject);
  });
} // loadPerspective

/**
 * @param {Array} promisesArr An array of AJAX GET promises.
 * @param {boolean} getRoot Get all subjects, set first published subject as
 * rootSubject
 * @param {boolean} getLens Get all lenses, use the first published lens
 */
function loadExtraStuffForCreatePerspective(perspective, params, promisesArr,
  getRoot, getLens) {
  pcValues.name = perspective.name;
  const stateObject = Object.assign(
    { perspectives: perspective ? perspective.name : '' },
    params
  );
  const pArr = promisesArr || [];

  const getAllSubjectsPromise = getPromiseWithUrl('subjects', '/v1/subjects');
  let subjectPromise;
  if (getRoot) {
    subjectPromise = getAllSubjectsPromise.then((val) => {
      pcValues.subjects = val.res;

      // get the first published subject, sorted in alphabetical order by
      // absolutePath
      const rootSubject = getPublishedObjectsbyField(val.res, 'absolutePath')
        .sort()[ZERO];
      return getHierarchy(rootSubject);
    });
  } else {
    subjectPromise = getAllSubjectsPromise;
  }

  pArr.push(subjectPromise);

  const getAllLensesPromise = getPromiseWithUrl('lenses', '/v1/lenses');
  let lensPromise;
  if (getLens) {
    lensPromise = getAllLensesPromise.then((val) => {
      pcValues.lenses = val.res;

      // get the first published lens, sorted in alphabetical order by name
      const lens = getPublishedObjectsbyField(val.res, 'name').sort()[ZERO];
      return getLensPromise(lens);
    });
  } else {
    lensPromise = getAllLensesPromise;
  }

  pArr.push(lensPromise);

  pArr.push(getPromiseWithUrl('aspectFilter', '/v1/aspects'));

  // TODO change this to GET from API, after its implemented;
  const statusFilter = [
    'Critical',
    'Invalid',
    'Timeout',
    'Warning',
    'Info',
    'OK',
  ];
  Promise.all(pArr).then((values) => {
    for (let i = values.length - ONE; i >= ZERO; i--) {
      pcValues[values[i].name] = values[i].res;
    }

    pcValues.statusFilter = statusFilter;
    pcValues.aspectTags = getTagsFromResources(pcValues.aspectFilter);
    pcValues.subjectTagFilter = getTagsFromResources(pcValues.subjects);
    loadController(pcValues, stateObject);
  });
} // loadExtraStuffForCreatePerspective

function handleUnnamedPerspective() {
  const promisesArr = [];
  // fill in missing info from params
  const { rootSubject, lens } = queryParams;
  let getRoot = false;
  let getLens = false;

  // if no loadObj.rootSubject, rootSubject is the first subject in GET subject
  if (rootSubject) {
    promisesArr.push(getHierarchy(rootSubject));
  } else if (!rootSubject) { // no queryParam.rootSubject: need to pass it to loadPerspective
    getRoot = true;
  }

  if (lens) {
    promisesArr.push(getLensPromise(lens));
  } else if (!lens) {
    getLens = true;
  }

  const params = getAllParams();
  loadPerspective(null, params);
  loadExtraStuffForCreatePerspective(null, params, promisesArr,
    getRoot, getLens);
} // handleUnnamedPerspective

/**
 * Retrieves the specified perspective, initiates loading lens and hierarchy.
 *
 * @param {String} perspNameOrId - The name or id of the perspective
 */
function getPerspective(perspNameOrId) {
  getPromiseWithUrl('perspective', `/v1/perspectives/${perspNameOrId}`)
  .then((val) => {
    setupSocketIOClient(val.res);
    const { lensId, name, rootSubject } = val.res;
    getHierarchy(rootSubject, getFilterQuery(val.res));
    getLensPromise(lensId);
    const p = { name, rootSubject, lensId };
    const params = getAllParams();
    loadPerspective(p, params);
    loadExtraStuffForCreatePerspective(p, params);
  })
  .catch((error) => {
    document.getElementById('errorInfo').innerHTML += error;
  });
}

/**
 * Figure out which perspective to load. If it's in the URL path, load that
 * one.
 * If it's not in the URL path, either use the DEFAULT_PERSPECTIVE from global
 * config OR the first perspective from the list of perspective names
 * (alphabetical order), and redirect to the URL using that perspective name.
 *
 * @param {Array} pnames - Array of perspective names
 */
function whichPerspective(pnames) {
  let h = window.location.href;
  if (!h.endsWith('/')) {
    h += '/';
  }

  let hsplit = h.split('/');
  hsplit.pop();
  let p = hsplit.pop();
  if (p && p !== 'perspectives') {
    getPerspective(p);
  } else {
    request.get(GET_DEFAULT_PERSPECTIVE)
    .set(REQ_HEADERS)
    .end((err, res) => {
      if (err) {
        p = pnames.shift(); // Grab the first one from the list
      } else {
        p = res.body.value;
      }

      // Add the perspective name to the URL and redirect.
      window.location.href = h + p;
    });
  }
} // whichPerspective

/**
 * Load all the perspective names to populate the dropdown. If there are no
 * perspectives, just render the perspective overlay over an empty page.
 */
function getPerspectiveNames() {
  request.get(GET_PERSPECTIVE_NAMES)
  .set(REQ_HEADERS)
  .end((err, res) => {
    const pnames = [];
    if (err) {
      handleError(err);
    } else {
      if (res.body.length === 0) {
        loadController({}, {});
      } else {
        for (let i = 0; i < res.body.length; i++) {
          pnames.push(res.body[i].name);
        }

        pnames.sort();
        whichPerspective(pnames);
      }
    }
  });
} // getPerspectiveNames

window.onload = () => {
  getPerspectiveNames();
};

if (eventThrottleMillis !== ZERO) {
  eventsQueue.scheduleFlushQueue(LENS_DIV, eventThrottleMillis);
}

/**
 * Passes data on to Controller to pass onto renderers.
 *
 * @param {Object} values Data returned from AJAX.
 * @param {Object} stateObject Data from queryParams.
 */
function loadController(values, stateObject) {
  ReactDOM.render(
    <PerspectiveController
      values={ values }
      stateObject={ stateObject }
    />,
    PERSPECTIVE_CONTAINER
  );
}
