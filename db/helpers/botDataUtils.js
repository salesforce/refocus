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
 * If a string contains some substring enclosed in between ${ and } this
 * is an indication that string needs to be replaced with some instance
 * value. The string between the ${ } tokens should be in the pattern
 * {Name of the bot}.{Name of botData}.{Key of botData}, by using that
 * pattern we will be able to replace the string with right value.
 *
 * eg)
 *   if:
 *     startingString === 'this is a ${Bot.Test}'
 *     replaceString === '${Bot.Test}'
 *     instance === {
 *       name: 'Test',
 *       botId: 'Bot',
 *       value: 'test'
 *     }
 *
 *   then:
 *     outputValue ==== 'this is a test'
 *
 *   if:
 *     startingString === 'this is a ${Bot.Test}'
 *     replaceString === '${Bot.Test.Name}'
 *     instance === {
 *       name: 'Test',
 *       botId: 'Bot',
 *       value: '{ Name: "test"}'
 *     }
 *
 *   then:
 *     outputValue === 'this is a test'
 *
 * @param {String} startingString - String to replace
 * @param {String} replaceString - Replacement value
 * @param {Object} instance - Updated instance
 * @returns {String} outputValue - String with output replaced
 */
function replaceValue(startingString, replaceString, instance) {
  let outputValue = startingString;
  const replaceField = replaceString.replace('${', '')
    .replace('}', '').split('.');
  if (replaceField.length > TWO) {
    outputValue = outputValue.replace(replaceString,
      JSON.parse(instance.value)[replaceField[TWO]]);
  } else {
    outputValue = outputValue
      .replace(replaceString, instance.value);
  }

  return outputValue;
} // replaceValue

/**
 * If the current room defines 'sharedContext' in its settings then on every
 * botData creation or update we need to determine if any botData follows
 * that data and needs to be updated or appended. If it does, then we do so;
 * if not we return false
 *
 * eg)
 *   if:
 *     Room.settings === {
 *       sharedContext':
 *         Bot1: {                      <----- Bot that is followed
 *           Bot2: {                    <----- Bots that are following
 *             botDataName:             <----- botData to update:
 *            'this is ${Bot1.Test}',   <----- Value to update botData with
 *           }
 *         }
 *       }
 *     }
 *
 *    Bot1.Test === {
 *      name: 'Test',
 *      botId: 'Bot1',
 *      value: 'a test'
 *    }
 *
 *   then:
 *     Bot2.botDataName === {
 *      name: 'botDataName',
 *      botId: 'Bot2',
 *      value: 'This is a test'
 *    }
 *
 * @param {Object} seq - Sequelize definitions
 * @param {Object} instance - botData that has been created/updated
 * @returns {undefined} - OK
 * @throws {validationError} - if the array does not contain valid attributes
 */
function updateValues(seq, instance) {
  const Room = seq.models.Room;
  const Bot = seq.models.Bot;
  const BotData = seq.models.BotData;
  const botNames = {};
  const botsIds = {};
  let room = null;
  return Room.findOne({ where: { id: instance.roomId } })
  .then((currentRoom) => {
    if (currentRoom && currentRoom.bots) {
      room = currentRoom;
      return Bot.findAll({
        attributes: ['name', 'id'],
        where: {
          name: {
            $in: room.bots,
          },
        },
      });
    }

    return [];
  })
  .then((botJSON) => {
    // Create lookups for bots by name or id
    botJSON.forEach((bot) => {
      botsIds[bot.dataValues.id] = bot.dataValues.name;
      botNames[bot.dataValues.name] = bot.dataValues.id;
    });
  })
  .then(() => {
    // Determine if a sync needs to be performed
    if (room && ('settings' in room) && ('sharedContext' in room.settings)) {
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
            const replaceBlocks = syncValue.match(/\${(.*?)}/g);

            // Replace logic blocks wtih vlaues
            replaceBlocks.forEach((replaceBlock) => {
              const replaceField = replaceBlock.replace('${', '')
                .replace('}', '').split('.');
              if (instance.dataValues.name === replaceField[ONE]) {
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
              }
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
