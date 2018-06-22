/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/deactivateRooms.js
 *
 * Gets an array of all rooms which should be deactivated, then deactivates
 * them and does a sync if this is enabled in the room settings.
 */
const featureToggles = require('feature-toggles');
const moment = require('moment');

const dbRoom = require('../../db/index').Room;
const dbEvent = require('../../db/index').Event;

const THRESHOLD_IN_MINUTES = 120; // 2 hours

function checkAndDeactivateRoom(room) {
  return dbEvent.findOne({
    where: { roomId: room.id },
  })
  .then((evt) => {
    if (evt) {
      const minsSinceLastEvent =
        moment().diff(moment(evt.createdAt), 'minutes');
      if (minsSinceLastEvent > THRESHOLD_IN_MINUTES) {
        if (room.settings && room.settings.sync) {
          room.settings.sync.forEach((bot) => {
            const syncBotAction = {
              name: bot.botAction,
              botId: bot.botId,
              roomId: room.id,
              isPending: true,
              parameters: [],
            };

            dbBotAction.create(syncBotAction);
          });
        }

        return room.update({ active: false });
      }
    }
  });
}

/* For each room that should be deactivated we need to:
 *  - Set active to false
 *  - If sync exists in settings, create sync action
 */
function execute() {
  const deactivateRooms = []; // Keeping track of rooms that were deactivated
  return dbRoom.findAll({ where: { active: true } })
  .then((dbRes) => {
    const promises = dbRes.map((room) => checkAndDeactivateRoom(room));
    return Promise.all(promises);
  });
} // execute

module.exports = {
  execute,
};
