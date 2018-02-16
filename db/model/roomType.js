/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/roomType.js
 *
 * Room Types are specialized configurations for rooms. They hold initial
 * data such as settings and rules to quickly make a room usable.
 *
 * Settings are key/value pairings that work similar to enviromental variables
 * they store data that configure bots so the rooms they are in.
 *
 * Rules contain rule that is a JSON Logic Object(http://jsonlogic.com/) and
 * and an action object that has the name of the action and parameters values
 * of the action needed to be taken when rule is valid.
 *
 */

const constants = require('../constants');
const u = require('../helpers/roomTypeUtils');
const assoc = {};

module.exports = function roomType(seq, dataTypes) {
  const RoomType = seq.define('RoomType', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    name: {
      type: dataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: constants.nameRegex,
      },
      comment: 'Create a named room type',
    },
    isEnabled: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Determines if room type is still enabled for use',
    },
    settings: {
      type: dataTypes.JSON,
      allowNull: true,
      comment: 'Key/Value pairs for user specific settings',
    },
    rules: {
      type: dataTypes.ARRAY(dataTypes.JSONB),
      allowNull: true,
      validate: {
        contains: u.validateRulesArray,
      },
      comment: 'Logic and resulting actions for rooms',
    },
    bots: {
      type: dataTypes.ARRAY(dataTypes.STRING),
      allowNull: true,
      comment: 'Bots to be used in roomType',
    },
  }, {
    classMethods: {
      getRoomTypeAssociations() {
        return assoc;
      },

      getProfileAccessField() {
        return 'roomTypeAccess';
      },

      postImport(models) {
        assoc.type = RoomType.hasMany(models.Room, {
          foreignKey: 'type',
        });
        assoc.bots = RoomType.belongsToMany(models.Bot, {
          foreignKey: 'roomTypeId',
          through: 'RoomTypeBots',
        });
        assoc.writers = RoomType.belongsToMany(models.User, {
          as: 'writers',
          through: 'RoomTypeWriters',
          foreignKey: 'roomTypeId',
        });
      },
    },
    hooks: {

      /**
       * Ensures that all bots in request actually exist
       *
       * @param {Instance} inst - The instance being created
       * @returns {Promise} which resolves to the instance, or rejects if
       *  a bot is not found or duplicate bots are requested
       */
      beforeCreate(inst /* , opts */) {
        return u.validateBotsArray(inst, seq);
      }, // hooks.beforeCreate

      /**
       * Ensures that all bots in request actually exist
       *
       * @param {Instance} inst - The instance being created
       * @returns {Promise} which resolves to the instance, or rejects if
       *  a bot is not found or duplicate bots are requested
       */
      beforeUpdate(inst /* , opts */) {
        return u.validateBotsArray(inst, seq);
      }, // hooks.beforeUpdate

      /**
       * Deletes previous relationships with old bots and creates
       * new relationships with new bots
       *
       * @param {RoomType} inst - The newly-created instance
       */
      afterUpdate(inst /* , opts */) {
        const bots = inst.dataValues.bots;

        return new seq.Promise((resolve, reject) => {
          if (!bots || !inst.changed('bots')) {
            resolve(inst);
          }

          new Promise((resolve, reject) => {
            if (inst._previousDataValues.bots) {
              inst._previousDataValues.bots.forEach((botName) => {
                seq.models.Bot.findOne({
                  where: {
                    name: {
                      $iLike: botName,
                    },
                  },
                })
                .then((o) => {
                  inst.removeBots(o)
                  .catch(reject);
                });
              });
            }

            resolve();
          })
          .then(() => {
            if (inst.dataValues.bots) {
              inst.dataValues.bots.forEach((botName) => {
                seq.models.Bot.findOne({
                  where: {
                    name: {
                      $iLike: botName,
                    },
                  },
                })
                .then((o) => {
                  inst.addBots(o)
                  .catch(reject);
                });
              });
              resolve(inst);
            }
          });
        });
      }, // hooks.afterUpdate

      /**
       * Deletes relationships between this roomtype and bots
       *
       * @param {RoomType} inst - The newly-created instance
       */
      beforeDelete(inst /* , opts */) {
        const bots = inst.dataValues.bots;

        return new seq.Promise((resolve, reject) => {
          if (!bots) {
            resolve(inst);
          }

          inst.dataValues.bots.forEach((botName) => {
            seq.models.Bot.findOne({
              where: {
                name: {
                  $iLike: botName,
                },
              },
            })
            .then((o) => {
              inst.removeBots(o)
              .catch(reject);
            });
          });
          resolve(inst);
        });
      }, // hooks.beforeDelete

      /**
       * Creates relationship between roomType & bots
       *
       * @param {RoomType} inst - The newly-created instance
       */
      afterCreate(inst /* , opts */) {
        const bots = inst.dataValues.bots;

        return new seq.Promise((resolve, reject) => {
          if (!bots) {
            resolve(inst);
          }

          inst.dataValues.bots.forEach((botName) => {
            seq.models.Bot.findOne({
              where: {
                name: {
                  $iLike: botName,
                },
              },
            })
            .then((o) => {
              inst.addBots(o)
              .catch(reject);
            });
          });
          resolve(inst);
        });
      }, // hooks.afterCreate
    },
  });
  return RoomType;
};
