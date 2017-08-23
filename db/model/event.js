
/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/event.js
 *
 * This model is to store any log that might need to be searched
 * for later. The context JSON can be any format that log line
 * requires.
 */

const assoc = {};

module.exports = function event(seq, dataTypes) {
  const Event = seq.define('Event', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    log: {
      type: dataTypes.STRING,
      allowNull: false,
      comment: 'This is a readable event logline',
    },
    context: {
      type: dataTypes.JSON,
      allowNull: true,
      comment:
        'This is any JSON you want store to facilitate the event entry',
    },
  }, {
    classMethods: {
      getEventAssociations() {
        return assoc;
      },

      getProfileAccessField() {
        return 'eventAccess';
      },

      postImport(models) {
        assoc.room = Event.belongsTo(models.Room, {
          foreignKey: 'roomId',
        });
        assoc.bot = Event.belongsTo(models.Bot, {
          foreignKey: 'botId',
        });
        assoc.botData = Event.belongsTo(models.BotData, {
          foreignKey: 'botDataId',
        });
        assoc.botAction = Event.belongsTo(models.BotAction, {
          foreignKey: 'botActionId',
        });
        assoc.user = Event.belongsTo(models.User, {
          foreignKey: 'userId',
        });
        assoc.writers = Event.belongsToMany(models.User, {
          as: 'writers',
          through: 'EventWriters',
          foreignKey: 'botId',
        });
      },
    },
    indexes: [
      {
        name: 'SpecificEvent',
        unique: true,
        fields: ['roomId', 'botId'],
      },
    ],
  });
  return Event;
};

