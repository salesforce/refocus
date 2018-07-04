/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * rooms/utils/layout.js
 */

const u = require('./../../utils');

const NEG_ONE = -1;

module.exports = {

  /**
   * Checks whether a layout object is valid for an array of Bots
   * @param {Object} layout - Layout object
   * @param {Array} bots - Bots in the room
   * @returns {boolean}
   */
  isValidLayout(layout, bots) {
    if (!layout || !layout.leftColumn || !layout.middleColumn ||
      !layout.rightColumn) {
      return false;
    }

    // Amount of bots in layout does not match amount of bots in room
    if (layout.leftColumn.length + layout.middleColumn.length +
      layout.rightColumn.length !== bots.length) {
      return false;
    }

    for (const param in layout) {
      // If a bot in the layout does not actually exist in the room
      if (layout[param] && layout[param].length
        && layout[param].every(bot => bots.indexOf(bot) === NEG_ONE)) {
        return false;
      }
    }

    return true;
  },

  /**
   * Gets the bot layout from the page and returns as an object.
   * @returns {{leftColumn: Array, middleColumn: Array, rightColumn: Array}}
   */
  getBotLayoutFromPage() {
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
    }

    return botsLayout;
  },

  // Gets bot layout from page and saves the stringified version as a cookie
  getLayoutAndSaveAsCookie() {
    const botsLayout = this.getBotLayoutFromPage();
    u.setCookie(`${window.location.pathname}-bots-layout`,
      JSON.stringify(botsLayout));
  },
};
