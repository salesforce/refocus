/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * rooms/utils/page.js
 */

const u = require('./../../utils');

// ids from view/rooms/index.pug
const TITLE_ELEM_ID = 'title';
const SUBTITLE_ELEM_ID = 'subTitle';
const SPINNER_ID = 'loading_spinner';

module.exports = {

  /**
   * Sets page title.
   * @param  {Object} document - Document object
   * @param  {String} title - Title string to be set
   * @returns {String} - Title string if successfull
   */
  setTitle(title) {
    return document.getElementById(TITLE_ELEM_ID).innerHTML = title;
  },

  /**
   * Sets page subtitle.
   * @param  {Object} document - Document object
   * @param  {String} title - Title string to be set
   * @returns {String} - Title string if successfull
   */
  setSubTitle(subtitle) {
    return document.getElementById(SUBTITLE_ELEM_ID).innerHTML = subtitle;
  },

  /**
   * Removes spinner from DOM.
   */
  removeSpinner() {
    u.removeSpinner(SPINNER_ID);
  },
};
