/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/botDataUtils.js
 *
 * Used by the Bot Data model.
 */
const _ = require('lodash');
const ZERO = 0;
const ONE = 1;
const TWO = 2;

/**
 * Check if a string is a JSON
 *
 * @param {String} item - String to check
 * @returns {Boolean} - if String is JSON
 */
function isJson(item) {
  let itemParse;
  itemParse = typeof item === 'string' ? item : JSON.stringify(item);

  try {
    itemParse = JSON.parse(itemParse);
  } catch (e) {
    return false;
  }

  if (typeof itemParse === 'object' && itemParse !== null) {
    return true;
  }

  return false;
} // isJson

/**
 * Check if a string is a JSON
 *
 * @param {String} startingString - String to replace
 * @param {String} replaceString - Replacement value
 * @param {Object} instance - Updated instance
 * @returns {String} outputValue - String with output replaced
 */
function replaceValue(startingString, replaceString, instance) {
  let outputValue = startingString;
  const replaceField = replaceString.replace('{$', '')
    .replace('$}', '').split('.');
  if (instance.name === replaceField[ONE]) {
    if (replaceField.length > TWO) {
      outputValue = outputValue.replace(replaceString,
        JSON.parse(instance.value)[replaceField[TWO]]);
    } else {
      outputValue = outputValue
        .replace(replaceString, instance.value);
    }
  }

  return outputValue;
} // replaceValue

/**
 * Determine if bot data needs to synced between bots and perform the action.
 *
 * @param {Object} seq - The array to test
 * @param {Object} instance - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} - if the array does not contain valid attributes
 */
function updateValues(seq, instance) {
  const Room = seq.models.Room;
  const Bot = seq.models.Bot;
  const BotData = seq.models.BotData;
  const botNames = {};
  const botsIds = {};
  return Bot.findAll({
    attributes: ['name', 'id'],
  })
  .then((botJSON) => {
    // Create lookups for bots by name or id
    botJSON.forEach((bot) => {
      botsIds[bot.dataValues.id] = bot.dataValues.name;
      botNames[bot.dataValues.name] = bot.dataValues.id;
    });
    return Room.findOne({ where: { id: instance.roomId } });
  })
  .then((room) => {
    // Determine if a sync needs to be performed
    if ('sharedContext' in room.settings) {
      const settings = room.settings.sharedContext;
      const context = settings[botsIds[instance.botId]];
      const promises = [];
      if (context) {
        // Create a different sync for each bot listed
        Object.keys(context).forEach((syncBot) => {
          let whereConst = {};
          let syncValue = '';
          Object.keys(context[syncBot]).forEach((botValueName) => {
            syncValue = isJson(context[syncBot][botValueName]) ?
              JSON.stringify(context[syncBot][botValueName]) :
              context[syncBot][botValueName];
            const replaceBlocks = syncValue.match(/{\$(.*?)\$}/g);

            // Replace logic blocks wtih vlaues
            replaceBlocks.forEach((replaceBlock) => {
              syncValue = replaceValue(
                syncValue,
                replaceBlock,
                instance.dataValues
              );
              whereConst = {
                where:
                {
                  name: botValueName,
                  botId: botNames[syncBot],
                  roomId: instance.roomId,
                },
              };
            });
          });

          // Find bot data to update
          promises.push(BotData.findOne(whereConst));
          promises.push(syncValue);
        });
      }

      return Promise.all(promises);
    }

    return false;
  })
  .then((data) => {
    if (data) {
      const updates = [];
      let newValue;

      // Update bot data
      for (let i = ZERO; i < data.length; i += TWO) {
        newValue = data[i + ONE];

        // If bot data is JSON then merge data
        if (isJson(data[i].value)) {
          newValue = JSON.stringify(
            _.extend(JSON.parse(data[i].value), JSON.parse(data[i + ONE]))
          );
        }

        updates.push(data[i].update({ value: newValue }));
      }

      return Promise.all(updates);
    }

    return false;
  });
} // updateValues

module.exports = {
  isJson,
  replaceValue,
  updateValues,
}; // exports
