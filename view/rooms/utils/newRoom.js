/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * rooms/utils/newRoom.js
 */

const utils = require('../../utils.js');
const ZERO = 0;

module.exports = {
  /**
   * Checks if a room already exists with a given name.
   *
   * @param {String} name - Name of the room to look for.
   * @returns {Promise} - Resolves to true if room exists, false otherwise
   */
  checkIfRoomExistsFromName(name) {
    const getUrl = `/v1/rooms?name=${name}`;
    return utils.getPromiseWithUrl(getUrl)
    .then((res) => {
      if (res.body && res.body[ZERO]) {
        return true;
      }

      return false;
    });
  },

  /**
   * Creates a room from parameters
   *
   * @param {Object} paramaters - Parameters to use when creating the room
   * @returns {Promise} - Resolves when room is created.
   */
  createRoomFromParameters(paramaters) {
    const postUrl = '/v1/rooms';
    let roomOrigin = paramaters.autoNaming ? 'auto_create' : 'web';
    if (paramaters.origin) {
      roomOrigin = paramaters.origin;
    }

    const room = {
      name: paramaters.name,
      type: paramaters.roomType,
      externalId: paramaters.externalId,
      active: paramaters.active,
      origin: roomOrigin,
    };

    return utils.postPromiseWithUrl(postUrl, room);
  },
};
