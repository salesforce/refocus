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

const THRESHOLD_IN_MINUTES = 180;

/* For each room that should be deactivated we need to:
 *  - Set active to false
 *  - If sync exists in settings, create sync action
 */
function execute() {
  dbRoom.findAll({ where: { active: true } })
  .then((dbRes) => {
    dbRes.forEach((r) => {
      dbEvent.findOne({ where: { roomId: r.id } })
      .then((e) => {
        const minsSinceLastEvent =
          moment().diff(moment(e.createdAt), 'minutes');
        console.log(minsSinceLastEvent);
        if (minsSinceLastEvent > THRESHOLD_IN_MINUTES) {
          r.update({ active: false })
          .then((res) => {
            if (r.settings && r.settings.sync) {
              r.settings.sync.forEach((bot) => {
                const syncBotAction = {
                    name: bot.botAction,
                    botId: bot.botId,
                    roomId: r.id,
                    isPending: true,
                    parameters: [],
                };

                dbBotAction.create(syncBotAction)
              })
            }
          })
        }
      })
    });
  });
} // execute

module.exports = {
  execute,
};
