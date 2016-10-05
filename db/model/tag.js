/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/tag.js
 */

const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function tag(seq, dataTypes) {
  const Tag = seq.define('Tag', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    name: {
      type: dataTypes.STRING(constants.fieldlen.normalName),
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
    },
    associatedModelName: {
      type: dataTypes.STRING,
      allowNull: false,
      comment: 'Name of the associated model.',
    },
    associationId: {
      type: dataTypes.UUID,
      allowNull: false,
      comment: 'Foriegn Key for the model',
    },
  }, {
    classMethods: {
      getTagAssociations() {
        return assoc;
      },
    },
    defaultScope: {
      order: ['Tag.name'],
    },
    hooks: {

      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
      }, // hooks.beforeDestroy

    }, // hooks
    indexes: [
      {
        name: 'TagUniqueLowercaseNameIsDeletedAssociationId',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
          'isDeleted',
          'associationId',
        ],
      },
    ],
    paranoid: true,
  });
  return Tag;
}; // exports
