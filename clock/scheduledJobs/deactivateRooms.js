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
const Op = require('sequelize').Op;

const dbRoom = require('../../db/index').Room;
const dbEvent = require('../../db/index').Event;
const dbBotAction = require('../../db/index').BotAction;
const conf = require('../../config');

/**
 * Deactivates a room if there has not been any recent activity in the room.
 * If a sync is defined in the settings of the room, it creates an action.
 *
 * @param {Object} room - Active room.
 * @returns {Promise} - Promise that room was deactivated.
 */
function checkAndDeactivateRoom(room) {
  // Getting most recent event for this room
  return dbEvent.findOne({
    where: { roomId: room.id },
    order: [['createdAt', 'DESC']],
  })
  .then((evt) => {
    if (evt) {
      // Time in minutes since any activity in this room
      const minsSinceLastEvent =
        moment().diff(moment(evt.createdAt), 'minutes');
      if (minsSinceLastEvent > conf.minRoomDeactivationAge) {
        // If a sync is defined we need to create an action
        if (room.settings && room.settings.sync) {
          room.settings.sync.forEach((bot) => {
            if (bot.botId && bot.botAction) {
              const syncBotAction = {
                name: bot.botAction,
                botId: bot.botId,
                roomId: room.id,
                isPending: true,
                parameters: [],
              };

              dbBotAction.create(syncBotAction);
            }
          });
        }

        return room.update({ active: false })
        .then(() => {
          const message = 'Room automatically deactivated due to ' +
            `${conf.minRoomDeactivationAge} minutes of inactivity.`;
          const eventType = {
            type: 'RoomState',
            active: false,
          };
          const deactivateEvent = {
            log: message,
            context: eventType,
            roomId: room.id,
          };

          return dbEvent.create(deactivateEvent);
        });
      }
    }
  });
}

/**
 * Execute the call to deactivate rooms with no recent activity
 *
 * @returns {Promise} - Promise that rooms were deactivated
 */
function execute() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - conf.minRoomDeactivationAge);
  return dbRoom.findAll(
    { where:
      {
        active: true,
        createdAt: {
          [Op.lt]: date,
        },
      },
  })
  .then((dbRes) => {
    const promises = dbRes.map((room) => checkAndDeactivateRoom(room));
    return Promise.all(promises);
  });
} // execute

module.exports = {
  execute,
};
