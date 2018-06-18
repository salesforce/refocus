/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/sampleTimeoutJob.js
 *
 * Executes the sample timeout process. If worker process is enabled, enqueues
 * a job, otherwise just executes work directly in this process.
 */
const featureToggles = require('feature-toggles');
const dbRoom = require('../../db/index').Room;
const dbBotAction = require('../../db/index').BotAction;

/**
 * Execute the call to check for sample timeouts.
 *
 * @returns {Promise}
 */
function execute() {
  console.log("bbbb")
  return dbRoom.shouldBeDeactivated()
  .then((dbRes) => {
    dbRes.forEach((r) => {
      console.log("aaaa")
      /* For each room that should be deactivated we need to:
       *  - Set active to false
       *  - If sync exists in settings, create sync action
       */

      r.update({ active: false })
      .then((res,err) => {
        if (err) {
          return console.log(err);
        }

        console.log(res);
        if (r.settings && r.settings.sync) {
          r.settings.sync.forEach((bot) => {
            const syncBotAction = {
                name: bot.botAction,
                botId: bot.botId,
                userId: _user.id,
                roomId: parseInt(ROOM_ID, 10),
                isPending: true,
                parameters: [],
            };

            dbBotAction.create(syncBotAction)
          })
        }
      })
    });

    return Promise.resolve(dbRes);
  });
} // execute

module.exports = {
  execute,
};
