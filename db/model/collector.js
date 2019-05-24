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
const dbUtils = require('../utils');
const activityLogUtil = require('../../utils/activityLog');
const Promise = require('bluebird');
const assoc = {};
const collectorConfig = require('../../config/collectorConfig');
const heartbeatUtils = require('../../api/v1/helpers/verbs/heartbeatUtils');
const collectorStatus = constants.collectorStatuses;

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
      type: dataTypes.ENUM(Object.keys(collectorStatus)),
      defaultValue: collectorStatus.Stopped,
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
    hooks: {
      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
      }, // beforeDestroy

      afterCreate(inst /* , opts*/) {
        return Promise.all([
          Promise.resolve()
          .then(() => {
            // Add createdBy user to Collector writers.
            if (inst.createdBy) {
              return inst.addWriter(inst.createdBy);
            }

            return Promise.resolve();
          }),
          u.assignUnassignedGenerators(),
        ]);
      }, // hooks.afterCreate

      beforeUpdate(inst /* , opts */) {
        // Invalid status transition: [Stopped --> Paused]
        if (inst.changed('status') && inst.status === collectorStatus.Paused &&
        inst.previous('status') === collectorStatus.Stopped) {
          const msg =
            'This collector cannot be paused because it is not running.';
          throw new ValidationError(msg);
        }
      }, // hooks.beforeUpdate

      afterUpdate(inst /* , opts */) {
        if (inst.changed('status')) {
          if (inst.status === collectorStatus.Running) {
            /* if status is changed to Running, then find and assign unassigned
             generators */
            return u.assignUnassignedGenerators();
          } else if (inst.previous('status') === collectorStatus.Running) {
            /* if status is changed from Running to anything else, reassign the
            generators which were assigned to this collector. If stopped or paused,
            reset the tracked changes for this collector. */
            return inst.reassignGenerators()
            .then(() => {
              if (inst.status !== collectorStatus.MissedHeartbeat) {
                return heartbeatUtils.resetChanges(inst.name);
              }
            });
          }
        }

        return inst;
      }, // afterUpdate
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

    // defined here to be accessible in Generator.postImport()
    scopes: {
      embed: {
        attributes: ['id', 'name', 'status', 'lastHeartbeat'],
        order: seq.col('name'),
      },
    },

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
   * Checks for collectors that have missed their heartbeat. Updates their status
   * and reassigns all affected generators.
   *
   * @returns {Promise<Array<Array<Generator>>>}
   */
  Collector.checkMissedHeartbeat = function () {
    return Collector.missedHeartbeat()
    .map((coll) => {
      logMissedHeartbeat(coll);
      return coll.update({ status: collectorStatus.MissedHeartbeat });
    });
  }; // checkMissedHeartbeat

  function logMissedHeartbeat(coll) {
    const logObj = {
      collector: coll.name,
      lastHeartbeat: coll.lastHeartbeat.getTime(),
      delta: Date.now() - coll.lastHeartbeat.getTime(),
    };

    activityLogUtil.printActivityLogString(logObj, 'missedHeartbeat');
  } // logMissedHeartbeat

  Collector.postImport = function (models) {
    assoc.collectorGroup = Collector.belongsTo(models.CollectorGroup, {
      as: 'collectorGroup',
      foreignKey: 'collectorGroupId',
    });

    assoc.currentGenerators = Collector.hasMany(models.Generator, {
      as: 'currentGenerators',
      foreignKey: 'collectorId',
    });

    assoc.owner = Collector.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner',
    });

    assoc.user = Collector.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'user',
    });

    assoc.writers = Collector.belongsToMany(models.User, {
      as: 'writers',
      through: 'CollectorWriters',
      foreignKey: 'collectorId',
    });

    Collector.addScope('baseScope', {
      order: seq.col('name'),
    });

    Collector.addScope('owner', {
      include: [
        {
          association: assoc.owner,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
      ],
    });

    Collector.addScope('user', {
      include: [
        {
          association: assoc.user,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
      ],
    });

    Collector.addScope('status', {
      attributes: ['status'],
    });

    Collector.addScope('running', {
      where: {
        status: collectorStatus.Running,
      },
    });

    Collector.addScope('currentGenerators', {
      include: [
        {
          model: models.Generator.scope('embed'),
          as: 'currentGenerators',
        },
      ],
    });

    Collector.addScope('collectorGroup', {
      include: [
        {
          model: models.CollectorGroup.scope('embed'),
          as: 'collectorGroup',
        },
      ],
    });

    Collector.addScope('defaultScope',
      dbUtils.combineScopes([
        'user',
        'owner',
        'baseScope',
        'currentGenerators',
        'collectorGroup',
      ], Collector),
      { override: true }
    );

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
    return this.status === collectorStatus.Running;
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
    const interval = collectorConfig.heartbeatIntervalMillis;
    const now = Date.now();
    const lastHeartbeat = this.lastHeartbeat.getTime();
    const elapsed = now - lastHeartbeat;
    return elapsed < (interval + tolerance);
  }; // isAlive

  /**
   * Reassigns all generators that are currently running on the collector.
   *
   * @param {Collector} coll - The collector to reassign generators
   * @returns {Promise<Array<Generator>>}
   */
  Collector.prototype.reassignGenerators = function () {
    return this.getCurrentGenerators()
      .map((g) => g.assignToCollector().then(() => g.save()));
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
