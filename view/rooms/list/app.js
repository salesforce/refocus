/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/rooms/list/app.js
 *
 * Create a list of all the rooms in refocus
 *
 */

import request from 'superagent';
import React from 'react';
import ReactDOM from 'react-dom';
import ListController from './ListController';
const listContainer = document.getElementById('root');
const GET_ROOMS = '/v1/rooms';
const REQ_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest',
  Expires: '-1',
  'Cache-Control': 'no-cache,no-store,must-revalidate,max-age=-1,private',
};

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
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
} // getPromiseWithUrl

window.onload = () => {
  getPromiseWithUrl(GET_ROOMS)
  .then((res) => {
    loadController(res.body);
  });
};

/**
 * Passes data on to Controller to pass onto renderers.
 *
 * @param {Object} values Data returned from AJAX.
 */
function loadController(values) {
  ReactDOM.render(
    <ListController
      rooms={ values }
    />,
    listContainer
  );
}

