/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/collector.js
 */

const common = require('../helpers/common');
const constants = require('../constants');
const ValidationError = require('../dbErrors').ValidationError;
const u = require('../helpers/collectorUtils');
const assoc = {};
const collectorConfig = require('../../config/collectorConfig');
const MS_PER_SEC = 1000;

module.exports = function collector(seq, dataTypes) {
  const Collector = seq.define('Collector', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    name: {
      type: dataTypes.STRING(constants.fieldlen.normalName),
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
    },
    description: {
      type: dataTypes.STRING(constants.fieldlen.longish),
    },
    helpEmail: {
      type: dataTypes.STRING(constants.fieldlen.email),
      validate: { isEmail: true },
    },
    helpUrl: {
      type: dataTypes.STRING(constants.fieldlen.url),
      validate: { isUrl: true },
    },
    host: {
      allowNull: true,
      type: dataTypes.STRING(constants.fieldlen.longish),
    },
    ipAddress: {
      allowNull: true,
      type: dataTypes.STRING(constants.fieldlen.normalName),
    },
    lastHeartbeat: {
      type: dataTypes.DATE,
      allowNull: true,
    },
    registered: {
      type: dataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    status: {
      type: dataTypes.ENUM(Object.keys(constants.collectorStatuses)),
      defaultValue: constants.collectorStatuses.Stopped,
      allowNull: false,
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    osInfo: {
      type: dataTypes.JSONB,
      allowNull: true,
      validate: {
        contains: u.validateOsInfo,
      },
    },
    processInfo: {
      type: dataTypes.JSONB,
      allowNull: true,
      validate: {
        contains: u.validateProcessInfo,
      },
    },
    version: {
      type: dataTypes.STRING,
      allowNull: false,
      validate: {
        validateObject(value) {
          u.validateVersion(value);
        },
      },
    },
  }, {
    defaultScope: {
      order: ['name'],
    },
    hooks: {
      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
      }, // beforeDestroy

      afterCreate(inst /* , opts*/) {
        // Add createdBy user to Collector writers.
        if (inst.createdBy) {
          return new seq.Promise((resolve, reject) =>
            inst.addWriter(inst.createdBy)
            .then(() => resolve(inst))
            .catch((err) => reject(err))
          );
        }

        return inst;
      }, // hooks.beforeCreate

      beforeUpdate(inst /* , opts */) {
        // Invalid status transition: [Stopped --> Paused]
        if (inst.changed('status') && inst.status === 'Paused' &&
        inst.previous('status') === 'Stopped') {
          const msg =
            'This collector cannot be paused because it is not running.';
          throw new ValidationError(msg);
        }
      }, // hooks.beforeUpdate
    }, // hooks
    indexes: [
      {
        name: 'CollectorUniqueLowercaseNameIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
          'isDeleted',
        ],
      },
    ],
    paranoid: true,
  });

  /**
   * Class Methods:
   */

  Collector.getCollectorAssociations = function () {
    return assoc;
  };

  Collector.getProfileAccessField = function () {
    return 'collectorAccess';
  };

  /**
   * Returns a list of running collectors where the time since the last
   * heartbeat is greater than the latency tolerance.
   *
   * @param {Integer} latencyTolerance - For testing, pass in heartbeat
   *  latency tolerance millis. If false-y, uses
   *  collectorConfig.heartbeatLatencyToleranceMillis.
   * @param {Date} now - For testing, pass in a Date object to represent
   *  the current time. If false-y, uses current time.
   */
  Collector.missedHeartbeat = function (latencyTolerance, now) {
    const tolerance = latencyTolerance ||
      collectorConfig.heartbeatLatencyToleranceMillis;
    const curr = (now || new Date()).getTime();
    return Collector.scope('running').findAll()
    .then((colls) => colls.filter((c) => {
      const elapsed = curr - new Date(c.lastHeartbeat).getTime();
      return elapsed >= tolerance;
    }));
  }; // missedHeartbeat

  Collector.postImport = function (models) {
    assoc.currentGenerators = Collector.belongsToMany(models.Generator, {
      as: 'currentGenerators',
      through: 'GeneratorCollectors',
      foreignKey: 'collectorId',
    });

    assoc.createdBy = Collector.belongsTo(models.User, {
      foreignKey: 'createdBy',
    });

    assoc.writers = Collector.belongsToMany(models.User, {
      as: 'writers',
      through: 'CollectorWriters',
      foreignKey: 'collectorId',
    });

    Collector.addScope('status', {
      attributes: ['status'],
    });

    Collector.addScope('running', {
      where: {
        status: constants.collectorStatuses.Running,
      },
    });
  };

  /**
   * Instance Methods:
   */

  Collector.prototype.isWritableBy = function (who) {
    return new seq.Promise((resolve /* , reject */) =>
      this.getWriters()
      .then((writers) => {
        if (!writers.length) {
          resolve(true);
        }

        const found = writers.filter((w) =>
          w.name === who || w.id === who);
        resolve(found.length === 1);
      }));
  }; // isWritableBy

  return Collector;
}; // exports
