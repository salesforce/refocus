import request from 'superagent';
import React from 'react';
import ReactDOM from 'react-dom';
import Perspective from './Perspective';
const u = require('../utils');
const eventsQueue = require('./eventsQueue');

// TODO get rid of this once all the lenses aren't using it
require('./lensUtils');

const ZERO = 0;
const ONE = 1;
const DEBUG_REALTIME = window.location.href.split(/[&\?]/)
  .includes('debug=REALTIME');
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
    eventsQueue.queue.length = 0;
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
   * Note: The "io" variable is defined by the "/socket.io.js" script included
   * in perspective.pug.
   */
  const socket = io(namespace);
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
  if (p.aspectFilter) {
    q += 'aspect=' + p.aspectFilter.join();
  }

  if (p.aspectTagFilter) {
    if (!q.endsWith('?')) {
      q += '&';
    }

    q += 'aspectTags=' + p.aspectTagFilter.join();
  }

  if (p.subjectTagFilter) {
    if (!q.endsWith('?')) {
      q += '&';
    }

    q += 'subjectTags=' + p.subjectTagFilter.join();
  }

  if (p.statusFilter) {
    if (!q.endsWith('?')) {
      q += '&';
    }

    q += 'status=' + p.statusFilter.join();
  }

  return q;
} // getFilterQuery

/**
 * Request the hierarchy data and notify the lens when the data is loaded.
 *
 * @param {String} p - The API path to GET resource
 */
function getHierarchyData(p) {
  request.get(p)
  .set(REQ_HEADERS)
  .end((err, res) => {
    if (err) {
      handleError(err);
    } else {
      // Trigger the lens event "refocus.lens.hierarchyLoad".
      const ev = new CustomEvent('refocus.lens.hierarchyLoad', {
        detail: res.body,
      });
      LENS_DIV.dispatchEvent(ev);
    }
  });
} // getHierarchyData

/**
 * Load the lens then move on to get the hierarchy data.
 *
 * @param {String} lensId The complete lensId to GET from.
 * @param {String} rootSubject The subject to GET from.
 * @param {String} filterString For getHierarchy.
 */
function getLensById(lensId, rootSubject, filterString) {
  request.get(`/v1/lenses/${lensId}`)
  .set(REQ_HEADERS)
  .end((err, res) => {
    if (err) {
      handleError(err);
    } else {
      // Inject the lens library files into the perspective page.
      handleLibraryFiles(res);

      // Trigger the lens event "refocus.lens.load".
      LENS_DIV.dispatchEvent(new CustomEvent('refocus.lens.load'));

      // Generate the hierarchy API path based on the rootSubject and filters.
      let apiPath = `/v1/subjects/${rootSubject}/hierarchy`;
      if (filterString) {
        apiPath += filterString;
      }

      getHierarchyData(apiPath);
    }
  });
} // getLensById

/**
 * Load the perspective, render the perspective overlay, load the lens and set
 * up the socket.io client.
 *
 * @param {String} pname - the perspective to load
 * @param {Array} pnames - array of perspective names (string)
 */
function getPerspective(pname, pnames) {
  request.get(`/v1/perspectives/${pname}`)
  .set(REQ_HEADERS)
  .end((err, res) => {
    if (err) {
      handleError(err);
    } else {
      const { lensId, rootSubject, name } = res.body;
      ReactDOM.render(
        <Perspective
          persNames={ pnames }
          name={ name }
        />,
        PERSPECTIVE_CONTAINER
      );

      // Now get the lens...
      const filterString = getFilterQuery(res.body);
      getLensById(lensId, rootSubject, filterString);
      setupSocketIOClient(res.body);
    }
  });
} // getPerspective

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
    getPerspective(p, pnames);
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
        ReactDOM.render(
          <Perspective
            persNames={ pnames }
            name={ name }
          />,
          PERSPECTIVE_CONTAINER
        );
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

getPerspectiveNames();

if (eventThrottleMillis !== ZERO) {
  eventsQueue.scheduleFlushQueue(LENS_DIV, eventThrottleMillis);
}
