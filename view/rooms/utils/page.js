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
const Cookies = require('js-cookie');
const u = require('./../../utils');

// ids from view/rooms/index.pug
const TITLE_ELEM_ID = 'title';
const SUBTITLE_ELEM_ID = 'subTitle';
const SPINNER_ID = 'loading_spinner';
const ROOMS_TAB = 'roomsTab';
const ROOM_TYPES_TAB = 'roomTypesTab';
const DEBUG_REALTIME = window.location.href.split(/[&\?]/)
  .includes('debug=REALTIME');

module.exports = {

  /**
   * Sets page title.
   * @param  {Object} document - Document object
   * @param  {String} title - Title string to be set
   * @returns {String} - Title string if successful
   */
  setTitle(title) {
    return document.getElementById(TITLE_ELEM_ID).innerHTML = title;
  },

  /**
   * Sets page subtitle.
   * @param  {Object} document - Document object
   * @param  {String} subtitle - Title string to be set
   * @returns {String} - subtitle string if successful
   */
  setSubtitle(subtitle) {
    return document.getElementById(SUBTITLE_ELEM_ID).innerHTML = subtitle;
  },

  /**
   * Removes spinner from DOM.
   */
  removeSpinner() {
    u.removeSpinner(SPINNER_ID);
  },

  /**
   * Activates Room nav tab.
   */
  setRoomsTab() {
    let roomsTab = document.getElementById(ROOMS_TAB);
    roomsTab.className += ' slds-is-active';
  },

  /**
   * Activates Room Types nav tab.
   */
  setRoomTypesTab() {
    let roomTypesTab = document.getElementById(ROOM_TYPES_TAB);
    roomTypesTab.className += ' slds-is-active';
  },

  writeInIframedoc(iframedoc, iframeContent) {
    if (iframedoc) {
      iframedoc.open();
      iframedoc.writeln(iframeContent);
      iframedoc.close();
    } else if (DEBUG_REALTIME) {
      console.log('Cannot inject dynamic contents into iframe.');
    }
  },

  saveLayoutAsCookie() {
    const leftColumn = document.getElementById('botsLeftColumn');
    const middleColumn = document.getElementById('botsMiddleColumn');
    const rightColumn = document.getElementById('botsRightColumn');

    const botsLayout = {
      leftColumn: [],
      middleColumn: [],
      rightColumn: [],
    };

    if (leftColumn && middleColumn && rightColumn) {
      Array.from(leftColumn.children).forEach((c) => {
        botsLayout.leftColumn.push(c.id.replace('-section', ''));
      });

      Array.from(middleColumn.children).forEach((c) => {
        botsLayout.middleColumn.push(c.id.replace('-section', ''));
      });

      Array.from(rightColumn.children).forEach((c) => {
        botsLayout.rightColumn.push(c.id.replace('-section', ''));
      });

      Cookies.set(`${window.location.pathname}-bots-layout`, botsLayout);
    }
  },
};
