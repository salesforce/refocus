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
      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
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

    CollectorGroup.addScope('defaultScope', {
      order: ['name'],
    }, { override: true });
  };

  /**
   * Instance Methods:
   */
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

  CollectorGroup.createCollectorGroup = function (requestBody) {
    let collectorGroup;
    let collectors;

    return Promise.resolve()
      .then(() => {
        if (requestBody.collectors && requestBody.collectors.length > 0) {
          return collectorUtils.validate(seq, requestBody.collectors);
        }

        return []; // Todo might be removed when saving empty collectors.
      })
      .then((_collectors) =>
        collectors = _collectors
      )
      .then(() => collectorGroup = CollectorGroup.build(requestBody))
      .then(() => {
        collectorGroup.collectors = collectors;
        return collectorGroup.save();
      })
      .then((persistedCollectorGroup) => {
        collectorGroup = persistedCollectorGroup;
        return collectorGroup.addCollector(collectors);
      })
      .then(() => collectorGroup.reload());
  };

  return CollectorGroup;
};
