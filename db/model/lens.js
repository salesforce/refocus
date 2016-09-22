/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/lens.js
 */

const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function lens(seq, dataTypes) {
  const Lens = seq.define('Lens', {
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
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    isCustom: {
      type: dataTypes.BOOLEAN,
      defaultValue: true,
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    isPublished: {
      type: dataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    library: {
      type: dataTypes.BLOB,
      allowNull: false,
    },
    name: {
      type: dataTypes.STRING,
      allowNull: false,
    },
    sourceDescription: {
      type: dataTypes.STRING(constants.fieldlen.longish),
    },
    sourceName: {
      type: dataTypes.STRING,
      allowNull: false,
    },
    sourceVersion: {
      type: dataTypes.STRING,
    },
    thumbnailUrl: {
      type: dataTypes.STRING(constants.fieldlen.url),
      validate: { isUrl: true },
    },
    version: {
      type: dataTypes.STRING,
    },
  }, {
    classMethods: {
      getLensAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.installedBy = Lens.belongsTo(models.User, {
          foreignKey: 'installedBy',
        });

        Lens.addScope('lensLibrary', {
          attributes: { include: ['name', 'library'] },
        }, {
          override: true,
        });

        // Lens.addScope('defaultScope', {
        //   include: [
        //     {
        //       model: models.User,
        //       attributes: [ 'id', 'name' ],
        //     }
        //   ],
        // }, {
        //   override: true,
        // });
      },
    },
    defaultScope: {
      attributes: { exclude: ['library'] },
      order: ['Lens.name'],
    },
    hooks: {
      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
      },

      /**
       * Makes sure isUrl/isEmail validations will handle empty strings
       * appropriately.
       *
       * @param {Lens} inst - The instance being validated
       * @returns {undefined} - OK
       */
      beforeValidate(inst /* , opts */) {
        if (inst.changed('helpUrl') &&
          inst.helpUrl !== null &&
          inst.helpUrl.length === 0) {
          inst.helpUrl = null;
        }

        if (inst.changed('thumbnailUrl') &&
          inst.thumbnailUrl !== null &&
          inst.thumbnailUrl.length === 0) {
          inst.thumbnailUrl = null;
        }

        if (inst.changed('helpEmail') &&
          inst.helpEmail !== null &&
          inst.helpEmail.length === 0) {
          inst.helpEmail = null;
        }
      },

    },
    name: {
      singular: 'Lens',
      plural: 'Lenses',
    },
    indexes: [
      {
        name: 'LensUniqueLowercaseNameIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
          'isDeleted',
        ],
      },
    ],
    paranoid: true,
    tableName: 'Lenses',
  });
  return Lens;
};
