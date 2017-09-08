/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/cryptUtils.js
 *
 * Utils for encryption and decryption needs in refocus
 */
'use strict'; // eslint-disable-line strict

const crypto = require('crypto');
const dbConstants = require('../db/constants');

/**
 * Encrypt the given data using passed in secretKey and algorithm
 * @param  {String} data -  Data to be encrypted
 * @param  {String} secretKey - Secret key for encryption
 * @param  {String} algorithm - Name of the encryption algorithm
 * @returns {String} - encrypted data
 */
function encrypt(data, secretKey, algorithm) {
  const cipher = crypto.createCipher(algorithm, secretKey);
  let crypted = cipher.update(data, 'utf-8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
} // encrypt

/**
 * Decrypt encrypted data using passed in secretKey and algorithm
 * @param  {String} data -  Data to be decrypted
 * @param  {String} secretKey - Secret key that was used from encryption
 * @param  {String} algorithm - Name of the encryption algorithm
 * @returns {String} - encrypted data
 */
function decrypt(data, secretKey, algorithm) {
  const decipher = crypto.createDecipher(algorithm, secretKey);
  let decrypted = decipher.update(data, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
} // decrypt

/**
 * This function fetches the sample generator secret key and the sample
 * generator encryption algorithm from the glocalConfig model
 * and returns an object containing the secretKey and algorithm
 * @param {Model} globalConfigModel - The sequelize Global Config Model
 * @returns {Object} - containing the secret key and algorithm
 */
function getSGEncryptionKeyAndAlgorithm(globalConfigModel) {
  const sgObj = {};
  return globalConfigModel.findOne({
    where: {
      key: dbConstants.SGEncryptionKey,
    },
  })
  .then((gc) => {
    if (!gc) {
      return Promise.resolve(gc);
    }

    sgObj.secretKey = gc.value;
    return globalConfigModel.findOne({
      where: {
        key: dbConstants.SGEncryptionAlgorithm,
      },
    });
  })
  .then((gc) => {
    sgObj.algorithm = gc ? gc.value : null;
    return sgObj;
  });
} // getSGEncryptionKeyAndAlgorithm

/**
 * Encrypts the sample generator context values, if the corresponding
 * sample generator template context definition value requires encryption.
 * If the secret key and algorithm are not found in the global config table
 * the encryption is not done.
 * @param  {GlobalConfig} globalConfigModel - The global config model
 * @param  {Object} sg - The sample generator object
 * @param  {Object} sgt - The sample generatot template object.
 * @returns {Objec} - sample generator object with encrypted context values
 */
function encryptSGContextValues(globalConfigModel, sg, sgt) {
  if (!sg.context || !sgt.contextDefinition) {
    return Promise.resolve(sg);
  }

  return getSGEncryptionKeyAndAlgorithm(globalConfigModel)
  .then((config) => {
    const isKeyAlgoConfigured =
      config && config.secretKey && config.algorithm;
    for (const key in sgt.contextDefinition) {
      if (sgt.contextDefinition.hasOwnProperty(key) &&
        sgt.contextDefinition[key].encrypted && sg.context[key]) {
        if (isKeyAlgoConfigured) {
          sg.context[key] = encrypt(sg.context[key], config.secretKey,
            config.algorithm);
        } else {
          return Promise.reject('Cannot encrypt the text without the ' +
            'secretKey and algorithm');
        }
      }
    }

    return sg;
  });
} // encryptSGContextValues

/**
 * Decrypts the encrypted sample generator context values. If the secret key
 * and algorithm are not found in the global config table the encryption is
 * not done.
 * @param  {GlobalConfig} globalConfigModel - The global config model
 * @param  {Object} sg - The sample generator object
 * @param  {Object} sgt - The sample generatot template object.
 * @returns {Objec} - sample generator object with decrypted context values
 */
function decryptSGContextValues(globalConfigModel, sg, sgt) {
  if (!sg.context || !sgt.contextDefinition) {
    return Promise.resolve(sg);
  }

  return getSGEncryptionKeyAndAlgorithm(globalConfigModel)
  .then((config) => {
    const isKeyAlgoConfigured =
      config && config.secretKey && config.algorithm;
    for (const key in sgt.contextDefinition) {
      if (sgt.contextDefinition.hasOwnProperty(key) &&
        sgt.contextDefinition[key].encrypted && sg.context[key]) {
        if (isKeyAlgoConfigured) {
          sg.context[key] = decrypt(sg.context[key], config.secretKey,
            config.algorithm);
        } else {
          return Promise.reject('Cannot decrypt the text without the ' +
            'secretKey and algorithm');
        }
      }
    }

    return sg;
  });
} // decryptSGContextValues

module.exports = {
  encryptSGContextValues,
  decryptSGContextValues,
  encrypt,
  decrypt,
  getSGEncryptionKeyAndAlgorithm,
};
