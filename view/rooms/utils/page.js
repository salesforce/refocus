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
const ROOMS_TAB = 'roomsTab';
const ROOM_TYPES_TAB = 'roomTypesTab';
const DEBUG_REALTIME = window.location.href.split(/[&\?]/)
  .includes('debug=REALTIME');

const svgURL = 'http://www.w3.org/2000/svg';
const xlinkURL = 'http://www.w3.org/1999/xlink';
const iconStandardClass =
  'footer-icon slds-icon-text-default slds-m-around--xx-small';

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

  setBannerText(text) {
    return document.getElementById('banner').innerHTML = text;
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

  /**
   * Creates an svg wrapped in a link for use in the footer.
   *
   * @param {String} img - Name of svg image.
   * @param {String} link - Link used when svg is clicked.
   * @returns {DOM} - An svg element wrapped in a link element.
   */
  createFooterLinkedSvg(img, link) {
    const linkEl = document.createElement('a');
    linkEl.href = link;
    linkEl.target = '_blank';
    linkEl.rel = 'noopener noreferrer';
    const svgElem = document.createElementNS(svgURL, 'svg');
    svgElem.setAttribute('class', iconStandardClass);
    const useElemUp = document.createElementNS(svgURL, 'use');
    useElemUp.setAttributeNS(
      xlinkURL,
      'xlink:href',
      `../static/icons/utility-sprite/svg/symbols-updated.svg#${img}`
    );

    svgElem.appendChild(useElemUp);
    linkEl.appendChild(svgElem);
    return linkEl;
  },
};
