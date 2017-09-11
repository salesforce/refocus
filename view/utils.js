/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/utils.js
 */
'use strict'; // eslint-disable-line strict

import request from 'superagent';
const constants = require('./constants');
const filters = ['aspectFilter',
                  'subjectTagFilter',
                  'aspectTagFilter',
                  'statusFilter',
                ];
const REQ_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest',
  Expires: '-1',
  'Cache-Control': 'no-cache,no-store,must-revalidate,max-age=-1,private',
};

/**
 * [Sets Cookie]
 * @param {[string]} cname  [Cookie name]
 * @param {[string]} cvalue [Cookie value]
 */
function setCookie(cname, cvalue) {
  document.cookie = cname + '=' + cvalue + '; ';
}

/**
 * [Get cookie by name]
 * @param  {[string]} cname [Cookie name]
 * @returns {[string]}       [Cooie value]
 */
function getCookie(cname) {
  const name = cname + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }

    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }

  return '';
}

/**
 * When passed a perspective object, it returns a namespace string based on the
 * fields set in the prespective object. A namespace string is of the format
 * subjectAbsolutePath&aspectFilterType=aspectNames&
 * subjectTagFilterType=subjectTags&aspectTagFilterType=aspectTags&
 * statusFilterType=statusFilter.
 * NOTE: It looks like socketIO is not able to send data over namespace
 * containing ',' and a combination of '&|' characters.
 * @param  {Instance} inst - Perspective object
 * @returns {String} - namespace string.
 */
function getNamespaceString(inst) {
  let namespace = '/';
  if (inst.rootSubject) {
    namespace += inst.rootSubject;
  }

  for (let i = 0; i < filters.length; i++) {
    if (inst[filters[i]] && inst[filters[i]].length) {
      namespace += constants.filterSeperator + inst[filters[i] + 'Type'] +
                constants.fieldTypeFieldSeparator +
                inst[filters[i]].join(constants.valuesSeparator);
    } else {
      namespace += constants.filterSeperator + inst[filters[i] + 'Type'];
    }
  }

  return namespace;
}

/**
 * Remove spinner from DOM
 *
 * @param  {String} spinnerID - Id of spinner
 */
function removeSpinner(spinnerID) {
  const spinner = document.getElementById(spinnerID);
  spinner.parentNode.removeChild(spinner);
}

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

module.exports = {
  setCookie,
  getCookie,
  getNamespaceString,
  removeSpinner,
  getPromiseWithUrl,
};
