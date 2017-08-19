/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/token.js
 */

const constants = require('../constants');
const common = require('../helpers/common');

const assoc = {};

module.exports = function token(seq, dataTypes) {
  const Token = seq.define('Token', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    name: {
      type: dataTypes.STRING(constants.fieldlen.normalName),
      allowNull: false,
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    isRevoked: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
  }, {
    classMethods: {
      getTokenAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.createdBy = Token.belongsTo(models.User, {
          foreignKey: 'createdBy',
        });
        Token.addScope('defaultScope',
          {
            include: [
              {
                association: assoc.createdBy,
              },
            ],
            order: ['Token.name'],
          },
          {
            override: true,
          }
        );
      },
    },
    hooks: {
      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
      },
    },
    indexes: [
      {
        name: 'TokenUniqueLowercaseNameCreatedByIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
          'createdBy',
          'isDeleted',
        ],
      },
    ],
    instanceMethods: {
      restore() {
        return new Promise((resolve, reject) =>
          this.update({ isRevoked: 0 })
          .then(resolve)
          .catch(reject));
      }, // restore

      revoke() {
        return new Promise((resolve, reject) =>
          this.update({ isRevoked: Date.now() })
          .then(resolve)
          .catch(reject));
      }, // revoke
    },
    paranoid: true,
  });
  return Token;
};
