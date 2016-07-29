import request from 'superagent';
const u = require('../../utils');
const eventsQueue = require('./eventsQueue');
const ZERO = 0;
const ONE = 1;

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
}

/**
 * Create dom elements for files in library
 * @param  {Object} lensResponse Response from lens api
 */
function handleLibraryFiles(lensResponse) {
  let lensScript;
  for (const filename in lensResponse.body.library) {
    const re = /(?:\.([^.]+))?$/;
    let ext = re.exec(filename)[ONE] || '';
    ext = ext.toLowerCase();
    if (filename === 'lens.js') {
      lensScript = document.createElement('script');
      const t = document.createTextNode(lensResponse.body.library[filename]);
      lensScript.appendChild(t);
    } else if (ext === 'css') {
      injectStyleTag(lensResponse, filename);
    } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
      const image = new Image();
      image.src = 'data:image/' + ext + ';base64,' +
       lensResponse.body.library[filename];
      document.body.appendChild(image);
    } else if (ext === 'js') {
      const s = document.createElement('script');
      const t = document.createTextNode(lensResponse.body.library[filename]);
      s.appendChild(t);
      document.body.appendChild(s);
    }
  }

  document.body.appendChild(lensScript);
}

/**
 * Creates filter string to be used in hierarchy api.
 * @param  {Object} perspectiveObject - perspective object
 * @returns {String} query string created using perspective filters.
 */
function getFilterQuery(perspectiveObject) {
  let queryString = '';
  if (perspectiveObject.aspectFilter) {
    queryString += 'aspect=' + perspectiveObject.aspectFilter.join();
  }

  if (perspectiveObject.aspectTagFilter) {
    queryString += '&aspectTags=' + perspectiveObject.aspectTagFilter.join();
  }

  if (perspectiveObject.subjectTagFilter) {
    queryString += '&subjectTags=' + perspectiveObject.subjectTagFilter.join();
  }

  if (perspectiveObject.statusFilter) {
    queryString += '&status=' + perspectiveObject.statusFilter.join();
  }

  if (queryString && queryString.startsWith('&')) {
    queryString = '?' + queryString.substr(ONE);
  }

  return queryString;
}

window.onload = () => {
  const perspName = window.location.href.split('/').pop();

  // get perspective.
  request.get(`/v1/perspectives/${perspName}`)
  .set({
    Authorization: u.getCookie('Authorization'),
    'X-Requested-With': 'XMLHttpRequest',
    Expires: '-1',
    'Cache-Control': 'no-cache,no-store,must-revalidate,max-age=-1,private',
  })
  .end((perspErr, perspRes) => {
    if (perspErr) {
      document.getElementById('errorInfo').innerHTML =
      'An unexpected error occurred.';
    } else {
      // get lens using lensId from perspective result object.
      request.get(`/v1/lenses/${perspRes.body.lensId}`)
      .set({
        Authorization: u.getCookie('Authorization'),
        'X-Requested-With': 'XMLHttpRequest',
        Expires: '-1',
        'Cache-Control': 'no-cache,no-store,must-revalidate,max-age=-1,private',
      })
      .end((lensErr, lensRes) => {
        if (lensErr) {
          document.getElementById('errorInfo').innerHTML =
          'An unexpected error occurred.';
        } else {
          // inject lens library files in perspective view.
          handleLibraryFiles(lensRes);

          // trigger refocus.lens.load event
          const lens = document.getElementById('lens');
          lens.dispatchEvent(new CustomEvent('refocus.lens.load'));

          // create hierarchy api path using root subject and filters
          let apiPath = `/v1/subjects/${perspRes.body.rootSubject}/hierarchy`;
          const filterString = getFilterQuery(perspRes.body);
          if (filterString) {
            apiPath += filterString;
          }

          // get hierarchy data.
          request.get(apiPath)
          .set({
            Authorization: u.getCookie('Authorization'),
            'X-Requested-With': 'XMLHttpRequest',
            Expires: '-1',
            'Cache-Control': 'no-cache,no-store,must-revalidate,max-age=-1,private',
          })
          .end((hierarchyErr, hierarchyRes) => {
            if (hierarchyErr) {
              document.getElementById('errorInfo').innerHTML =
              'An unexpected error occurred.';
            } else {
              // trigger refocus.lens.hierarchyLoad event
              const ev = new CustomEvent('refocus.lens.hierarchyLoad', {
                detail: hierarchyRes.body,
              });
              document.getElementById('lens').dispatchEvent(ev);
            }
          });
        }
      });
    }
  });
};

const lensElement = document.getElementById('lens');
if (realtimeEventThrottleMilliseconds !== ZERO) {
  eventsQueue.scheduleFlushQueue(
    lensElement, realtimeEventThrottleMilliseconds
  );
}

/**
 * Handle event data, push the event data to the event queue.
 * @param  {String} eventData - Data recieved with event
 * @param  {String} eventTypeName - Event type
 */
function handleEvent(eventData, eventTypeName) {
  eventsQueue.enqueueEvent(eventTypeName, JSON.parse(eventData)[eventTypeName]);
  if (realtimeEventThrottleMilliseconds === ZERO) {
    eventsQueue.createAndDispatchLensEvent(eventsQueue.queue, lensElement);
    eventsQueue.queue.length = 0;
  }
}

const socket = io();
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
