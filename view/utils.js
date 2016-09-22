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

const constants = require('./constants');

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
  if (inst.aspectFilter) {
    namespace += constants.filterSeperator + inst.aspectFilterType +
                constants.fieldTypeFieldSeparator +
                inst.aspectFilter.join(constants.valuesSeparator);
  } else {
    namespace += constants.filterSeperator + inst.aspectFilterType;
  }
  if (inst.subjectTagFilter) {
    namespace += constants.filterSeperator + inst.subjectTagFilterType +
                constants.fieldTypeFieldSeparator +
                inst.subjectTagFilter.join(constants.valuesSeparator);
  } else {
    namespace += constants.filterSeperator + inst.subjectTagFilterType;
  }
  if (inst.aspectTagFilter) {
    namespace += constants.filterSeperator + inst.aspectTagFilterType +
                constants.fieldTypeFieldSeparator +
                inst.aspectTagFilter.join(constants.valuesSeparator);
  } else {
    namespace += constants.filterSeperator + inst.aspectTagFilterType;
  }
  if (inst.statusFilter) {
    namespace += constants.filterSeperator + inst.statusFilterType +
                constants.fieldTypeFieldSeparator +
                inst.statusFilter.join(constants.valuesSeparator);
  } else {
    namespace += constants.filterSeperator + inst.statusFilterType;
  }

  return namespace;
}

module.exports = {
  setCookie,
  getCookie,
  getNamespaceString,
};
