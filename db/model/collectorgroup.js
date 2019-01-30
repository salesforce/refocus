/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/collectorgroup.js
 */

const common = require('../helpers/common');
const collectorUtils = require('../helpers/collectorUtils');
const constants = require('../constants');
const dbUtils = require('../utils');
const ValidationError = require('../dbErrors').ValidationError;
const assoc = {};

module.exports = function collectorgroup(seq, dataTypes) {
  const CollectorGroup = seq.define('CollectorGroup', {
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
      allowNull: false,
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
  }, {
    hooks: {
      /**
       * Delete not permitted if in use by a Sample Generator.
       *
       * @param {SequelizeInstance} inst - the instance to be deleted
       * @returns {Promise}
       */
      beforeDestroy(inst /* , opts */) {
        return seq.models.Generator.findAll({
          where: { collectorGroupId: inst.id },
          attributes: ['name'],
        })
          .then((usedByGenerators) => {
            if (usedByGenerators && usedByGenerators.length) {
              const genNames = usedByGenerators.map((g) => g.name).join(', ');
              throw new ValidationError({
                message:
                  `Cannot delete ${inst.name} because it is still in use by ` +
                  `sample generator(s) [${genNames}]`,
              });
            }

            return common.setIsDeleted(seq.Promise, inst);
          });
      }, // beforeDestroy

      afterCreate(inst /* , opts*/) {
        return Promise.all([
          Promise.resolve()
          .then(() => {
            // Add createdBy user to CollectorGroup writers.
            if (inst.createdBy) {
              return inst.addWriter(inst.createdBy);
            }

            return Promise.resolve();
          }),
        ]);
      }, // hooks.afterCreate
    }, // hooks
    indexes: [
      {
        name: 'CollectorGroupUniqueLowercaseNameIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
          'isDeleted',
        ],
      },
    ],
    paranoid: true,
  });

  // Class Methods

  CollectorGroup.postImport = function (models) {
    assoc.collectors = CollectorGroup.hasMany(models.Collector, {
      as: 'collectors',
      foreignKey: 'collectorGroupId',
    });

    assoc.writers = CollectorGroup.belongsToMany(models.User, {
      as: 'writers',
      through: 'CollectorGroupWriters',
      foreignKey: 'collectorGroupId',
    });

    assoc.createdBy = CollectorGroup.belongsTo(models.User, {
      foreignKey: 'createdBy',
    });

    CollectorGroup.addScope('baseScope', {
      order: ['name'],
    });

    CollectorGroup.addScope('collectors', {
      include: [
        {
          model: models.Collector.scope('embed'),
          as: 'collectors',
          required: false,
        },
      ],
    });

    CollectorGroup.addScope('defaultScope',
      dbUtils.combineScopes([
        'baseScope',
        'collectors',
      ], CollectorGroup),
      { override: true }
    );
  };

  CollectorGroup.createCollectorGroup = function (requestBody) {
    let collectors;
    return collectorUtils.validate(seq, requestBody.collectors)
      .then(collectorUtils.alreadyAssigned)
      .then((validCollectors) => (collectors = validCollectors))
      .then(() => CollectorGroup.create(requestBody))
      .then((collectorGroup) =>
        (collectors.length ? collectorGroup.setCollectors(collectors) :
          collectorGroup))
      .then((collectorGroup) => collectorGroup.reload());
  }; // createCollectorGroup

  // Instance Methods

  CollectorGroup.prototype.isWritableBy = function (who) {
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

  /**
   * Add the named collectors to this collector group. Reject if any of the
   * named collectors is already assigned to this group, or to a different
   * group.
   *
   * @param {Array<String>} arr - array of collector names
   * @returns {Promise<any | never>}
   */
  CollectorGroup.prototype.addCollectorsToGroup = function (arr) {
    return collectorUtils.validate(seq, arr)
      .then(collectorUtils.alreadyAssigned)
      .then((collectors) => this.addCollectors(collectors))
      .then(() => this.reload());
  }; // addCollectorsToGroup

  /**
   * Delete the named collectors from this collector group. Reject if any of
   * the named collectors are not already assigned to this group, or if the
   * array is empty.
   *
   * @param {Array<String>} arr - array of collector names
   * @returns {Promise<any | never>}
   */
  CollectorGroup.prototype.deleteCollectorsFromGroup = function (arr) {
    let currentCollectors = [];
    return this.getCollectors()
      .then((curr) => {
        currentCollectors = curr;
        if (currentCollectors.length === 0) {
          throw new ValidationError('There are no collectors currently ' +
            'assigned to this collector group');
        }
      })
      .then(() => collectorUtils.validate(seq, arr))
      .then((toRemove) => {
        // Reject if any of the collectors to remove are not already in this
        // collector group.
        const notCurrentlyInGroup = toRemove.filter((c) =>
          !c.collectorGroupId || c.collectorGroupId !== this.id);
        if (notCurrentlyInGroup.length) {
          const namesToReject = notCurrentlyInGroup.map((c) => c.name);
          const msg = 'This collector group does not contain ' +
            `[${namesToReject.join(', ')}]`;
          throw new ValidationError(msg);
        }

        const namesToRemove = toRemove.map((c) => c.name);
        const toRemain = currentCollectors.filter((c) =>
          !namesToRemove.includes(c.name));
        return this.setCollectors(toRemain);
      })
      .then(() => this.reload());
  }; // deleteCollectorsFromGroup

  return CollectorGroup;
};
