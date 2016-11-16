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
const u = require('../helpers/userUtils');

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
    token: {
      type: dataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    isDisabled: {
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
            attributes: { exclude: ['token'] },
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

      beforeCreate(inst /* , opts */) {
        return new seq.Promise((resolve, reject) =>
          u.hashPassword(seq, inst.get('token'))
          .then((hash) => inst.set('token', hash))
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
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
    paranoid: true,
  });
  return Token;
};
