/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/ssoconfig.js
 */

const common = require('../helpers/common');
const constants = require('../constants');
const SSOConfigCreateConstraintError = require('../dbErrors')
  .SSOConfigCreateConstraintError;

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const SSOConfig = seq.define('SSOConfig', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    samlEntryPoint: {
      type: dataTypes.STRING(constants.fieldlen.url),
      validate: { isUrl: true },
      allowNull: false,
    },
    samlIssuer: {
      type: dataTypes.STRING,
      allowNull: false,
    },
  }, {
    classMethods: {
      postImport(models) {
        assoc.createdBy = SSOConfig.belongsTo(models.User, {
          foreignKey: 'createdBy',
        });
      },
    },
    hooks: {

      /**
       * Restrict creating new instance if one already exists.
       * @param  {SSOConfig} inst The instance being created
       * @returns {Promise}
       */
      beforeCreate(inst /* , opts */) {
        return new seq.Promise((resolve, reject) =>
          SSOConfig.findOne()
          .then((ssoconfig) => {
            if (ssoconfig !== null) {
              const err = new SSOConfigCreateConstraintError();
              err.subject = 'SSO config already exists';
              throw err;
            }
          })
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
      }, // hooks.beforeCreate

      /**
       * Makes sure name/samlEntryPoint/samlIssuer validations will
       * handle empty strings appropriately.
       * @param {SSOConfig} inst - The instance being validated
       */
      beforeValidate(inst /* , opts */) {
        if (inst.changed('samlEntryPoint') &&
          inst.samlEntryPoint !== null &&
          inst.samlEntryPoint.length === 0) {
          inst.samlEntryPoint = null;
        }

        if (inst.changed('samlIssuer') &&
          inst.samlIssuer !== null &&
          inst.samlIssuer.length === 0) {
          inst.samlIssuer = null;
        }
      }, // hooks.beforeValidate
    },
    paranoid: true,
  });
  return SSOConfig;
};
