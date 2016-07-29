/**
 * view/focus/app.js
 *
 * Provides implementations of "perspective" event handlers.
 */
import request from 'superagent';
const u = require('../utils');

/*
 * TODO importing lens js will be dynamic... this is just hard-coded for now :(
 */
import lens from './lens-tree'; // eslint-disable-line no-unused-vars

const LENS_DIV_ID = 'lens';
const lensEvent = {
  load: 'refocus.lens.load',
  hierarchyLoad: 'refocus.lens.hierarchyLoad',
};

/* The "subjectKey" variable referenced here is defined in focus.jade. */
const HIERARCHY_API_ENDPOINT =
  `/v1/subjects/${subjectKey}/hierarchy`; // eslint-disable-line no-undef

/**
 * Retrieve the hierarchy data for the subject specified in the path. Once the
 * hierarchy data is returned, emit the hierarchyLoad event on the lens div.
 */
function loadData() {
  request.get(HIERARCHY_API_ENDPOINT)
  .set({
    Authorization: u.getCookie('Authorization'),
    'X-Requested-With': 'XMLHttpRequest',
    Expires: '-1',
    'Cache-Control': 'no-cache,no-store,must-revalidate,max-age=-1,private',
  })
  .end((err, res) => {
    if (err) {
      console.log(err); // TODO push error up to user
    } else {
      document.getElementById(LENS_DIV_ID)
      .dispatchEvent(new CustomEvent(lensEvent.hierarchyLoad, {
        detail: res.body,
      }));
    }
  });
} // loadData

/*
 * Register the Perspective's "beforeunload" event listener. This listener
 * performs any necessary cleanup when the window, the document and its
 * resources are about to be unloaded.
 */
window.addEventListener('beforeunload', () => {
  console.log('Entered perspective event handler for "beforeUnload" event');
});

/*
 * Register the Perspective's "load" event listener. Performs any necessary
 * initialization when all the resources have finished loading.
 */
window.addEventListener('load', () => {
  document.getElementById(LENS_DIV_ID)
    .dispatchEvent(new CustomEvent(lensEvent.load));
  loadData();
});

/*
 * Register the Perspective's "unload" event listener. Performs any necessary
 * cleanup when the document or a child resource is being unloaded. It is
 * fired after:
 *  - beforeunload (cancellable event)
 *  - pagehide
 */
window.addEventListener('unload', () => {
  console.log('Entered perspective event handler for "unload" event');
});

/*
 * Register the Perspective's "pageshow" event listener. Performs any necessary
 * initialization when a session history entry is being traversed to. (This
 * includes back/forward as well as initial page-showing after the onload
 * event.)
 */
window.addEventListener('pageshow', () => {
  console.log('Entered perspective event handler for "pageshow" event');
});

/*
 * Register the Perspective's "pagehide" event listener. Performs any necessary
 * cleanup when a session history entry is being traversed from.
 */
window.addEventListener('pagehide', () => {
  console.log('Entered perspective event handler for "pagehide" event');
});
