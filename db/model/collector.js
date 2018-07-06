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
   * @returns {Array<Collector>}
   */
  Collector.missedHeartbeat = function () {
    return Collector.scope('defaultScope', 'running').findAll()
    .then((colls) => colls.filter((c) => !c.isAlive()));
  }; // missedHeartbeat

  /**
   * Returns a single running collector where the time since the last
   * heartbeat is within the latency tolerance.
   *
   * @returns {Collector}
   */
  Collector.findAliveCollector = function () {
    return Collector.scope('defaultScope', 'running').findAll()
    .then((colls) => colls.find((c) => c.isAlive()));
  }; // findAliveCollector

  /**
   * Checks for collectors that have missed their heartbeat. Updates their status
   * and reassigns all affected generators.
   *
   * @returns {Promise<Array<Array<Generator>>>}
   */
  Collector.checkMissedHeartbeat = function () {
    return Collector.missedHeartbeat()
    .then((deadCollectors) =>
      Promise.all(deadCollectors.map((coll) =>
        coll.update({ status: constants.collectorStatuses.MissedHeartbeat })
        .then(() => coll.reassignGenerators())
      ))
    );
  }; // checkMissedHeartbeat

  Collector.postImport = function (models) {

    // This field is not currently needed by collector, but table already exists
    // because generator needs to access its possible collectors.
    assoc.possibleGenerators = Collector.belongsToMany(models.Generator, {
      as: 'possibleGenerators',
      through: 'GeneratorCollectors',
      foreignKey: 'collectorId',
    });

    assoc.currentGenerators = Collector.hasMany(models.Generator, {
      as: 'currentGenerators',
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

  /**
   * Returns true if this collector is running
   *
   * @returns {Boolean}
   */
  Collector.prototype.isRunning = function () {
    return this.status === constants.collectorStatuses.Running;
  }; // isRunning

  /**
   * Determines whether the time since the last heartbeat is within
   * the latency tolerance.
   *
   * @returns {Boolean}
   */
  Collector.prototype.isAlive = function () {
    if (!this.lastHeartbeat) return false;
    const tolerance = collectorConfig.heartbeatLatencyToleranceMillis;
    const now = Date.now();
    const lastHeartbeat = this.lastHeartbeat.getTime();
    const elapsed = now - lastHeartbeat;
    return elapsed < tolerance;
  }; // isAlive

  /**
   * Reassigns all generators that are currently running on the collector.
   *
   * @param {Collector} coll - The collector to reassign generators
   * @returns {Promise<Array<Generator>>}
   */
  Collector.prototype.reassignGenerators = function () {
    /* TODO: change to use currentGenerators once that includes current gens only */
    return seq.models.Generator.findAll({ where: { currentCollector: this.name } })
    .then((gens) => Promise.all(gens.map((g) => g.assignToCollector())));
  };

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
