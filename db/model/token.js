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
const ms = require('ms');
const Op = require('sequelize').Op;
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
    lastUsed: {
      type: dataTypes.DATE,
      defaultValue: Date.now(),
    },
  }, {
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
    paranoid: true,
  });

  /**
   * Class Methods:
   */

  Token.getTokenAssociations = function () {
    return assoc;
  };

  Token.postImport = function (models) {
    assoc.createdBy = Token.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'user',
    });

    Token.addScope('baseScope', {
      order: seq.col('name'),
    });

    Token.addScope('defaultScope', {
      include: [
        {
          association: assoc.createdBy,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: seq.col('name'),
    }, {
      override: true,
    });

    Token.addScope('user', {
      include: [
        {
          association: assoc.createdBy,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    Token.addScope('notRevoked', (name, createdBy) => ({
      where: {
        name,
        createdBy,
        isRevoked: 0,
      },
      attributes: ['id'],
    }));
  };

  /**
   * Deletes tokens unused since the provided threshold. Deletes both revoked
   * AND un-revoked tokens. Does nothing if the "since" threshold does not
   * resolve to a negative number of milliseconds.
   *
   * @param {String|Integer} since - a time offset e.g. "-1d" for one day ago,
   *  or numeric value -360000 for one minute ago.
   * @returns {Promise<Integer>} number of records deleted
   */
  Token.deleteUnused = function (since) {
    try {
      // eslint-disable-next-line no-magic-numbers
      const millis = ms(since) || 0;
      if (millis < 0) { // eslint-disable-line no-magic-numbers
        return Token.destroy({
          where: {
            lastUsed: {
              [Op.lt]: new Date(Date.now() + ms(since)),
            },
          },
        });
      }
    } catch (err) {
      // NO-OP
    }

    // we deleted zero records
    return Promise.resolve(0); // eslint-disable-line no-magic-numbers
  };

  /**
   * Instance Methods:
   */

  Token.prototype.restore = function () {
    return new Promise((resolve, reject) =>
      this.update({ isRevoked: 0 })
      .then(resolve)
      .catch(reject));
  }; // restore

  Token.prototype.revoke = function () {
    return new Promise((resolve, reject) =>
      this.update({ isRevoked: Date.now() })
      .then(resolve)
      .catch(reject));
  }; // revoke

  Token.prototype.setLastUsed = function (lastUsed) {
    return new Promise((resolve, reject) =>
      this.update({ lastUsed: lastUsed || Date.now() })
      .then(resolve)
      .catch(reject));
  }; // setLastUsed

  return Token;
};
