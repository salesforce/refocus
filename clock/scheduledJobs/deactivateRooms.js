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

/* For each room that should be deactivated we need to:
 *  - Set active to false
 *  - If sync exists in settings, create sync action
 */
function execute() {
  const deactivateRooms = []; // Keeping track of rooms that were deactivated
  return dbRoom.findAll({ where: { active: true } })
  .then((dbRes) => {
    if (dbRes.length) {
      return Promise.all(dbRes.map(r => {
        return dbEvent.findAll({ // Finding most recent event for room
          where: { roomId: r.id },
          order: [['createdAt', 'DESC']],
        })
        .then((evts) => {
          if (evts.length) {
            const minsSinceLastEvent =
              moment().diff(moment(evts[0].createdAt), 'minutes');
            if (minsSinceLastEvent > THRESHOLD_IN_MINUTES) {
              return r.update({ active: false })
              .then(() => {
                // If a sync is defined then create action
                if (r.settings && r.settings.sync) {
                  r.settings.sync.forEach((bot) => {
                    const syncBotAction = {
                      name: bot.botAction,
                      botId: bot.botId,
                      roomId: r.id,
                      isPending: true,
                      parameters: [],
                    };

                    dbBotAction.create(syncBotAction);
                  });
                }

                deactivateRooms.push(r);
              });
            }
          }
        });
      })).then(() => {
        // Finished mapping active rooms, return deactivated
        return Promise.resolve(deactivateRooms);
      });
    }

    // No active rooms
    return Promise.resolve(deactivateRooms);
  });
} // execute

module.exports = {
  execute,
};
