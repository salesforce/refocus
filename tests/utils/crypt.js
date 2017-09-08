/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/utils/crypt.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const dbConstants = require('../../db/constants');
const generatorUtils = require('../../utils/cryptUtils');
const tu = require('../testUtils');
const GlobalConfig = tu.db.GlobalConfig;

describe('tests/utils/cryptUtils.js >', () => {
  const secretKey = 'mySecretKey';
  const algorithm = 'aes-256-cbc';

  beforeEach((done) => {
    GlobalConfig.create({
      key: dbConstants.SGEncryptionKey,
      value: secretKey,
    })
    .then(() => GlobalConfig.create({
      key: dbConstants.SGEncryptionAlgorithm,
      value: algorithm,
    }))
    .then(() => done())
    .catch(done);
  });

  afterEach((done) => {
    GlobalConfig.destroy({ truncate: true, force: true })
    .then(() => done())
    .catch(done);
  });

  describe('encrypt/decrypt', () => {
    it('encrypt a text and decrypt it again to make sure the decrypted ' +
      'text matches the original text', (done) => {
      const data = 'My data';
      const encryptedData = generatorUtils.encrypt(data, secretKey, algorithm);
      const decryptedData = generatorUtils.decrypt(encryptedData,
        secretKey, algorithm);
      expect(decryptedData).to.equal(data);
      done();
    });
  });

  describe('getSGEncryptionKeyAndAlgorithm', () => {
    it('object returned must have secretKey and algorithim as keys', (done) => {
      generatorUtils.getSGEncryptionKeyAndAlgorithm(GlobalConfig)
      .then((gc) => {
        expect(gc.secretKey).to.equal(secretKey);
        expect(gc.algorithm).to.equal(algorithm);
        done();
      }).catch(done);
    });
  });

  describe('encryptSGContextValues', () => {
    it('when encrypted is set to true in SGT, the related SG values ' +
      'should be encrypted', (done) => {
      const looksLikeSGT = {
        name: 'My_TEST_SGT',
        version: '1.0.0',
        contextDefinition: {
          password: {
            encrypted: true,
          },
          secretInformation: {
            encrypted: true,
          },
          otherNonSecretInformation: {
            encrypted: false,
          },
        },
      };

      const password = 'superlongandsupersecretpassword';
      const secretInformation = 'asecretthatyoushouldnotknow';
      const otherNonSecretInformation = 'nonsecreInformation';
      const looksLikeSG = {
        name: 'MY_TEST_SG',
        version: '1.0.0',
        context: {
          password,
          secretInformation,
          otherNonSecretInformation,
        },
      };
      generatorUtils.encryptSGContextValues(GlobalConfig,
        looksLikeSG, looksLikeSGT)
      .then((sg) => {
        expect(sg).to.not.equal(undefined);
        expect(sg.context.otherNonSecretInformation)
          .equal(otherNonSecretInformation);
        expect(Object.keys(sg)).to.deep.equal(Object.keys(looksLikeSG));
        return generatorUtils.decryptSGContextValues(GlobalConfig,
        looksLikeSG, looksLikeSGT);
      })
      .then((sg) => {
        expect(sg).to.deep.equal(looksLikeSG);
        done();
      }).catch(done);
    });

    it('when global config does not have the secret key or algorithm, ' +
      'encryption should not happen', (done) => {
      const looksLikeSGT = {
        name: 'My_TEST_SGT',
        version: '1.0.0',
        contextDefinition: {
          password: {
            encrypted: true,
          },
          secretInformation: {
            encrypted: true,
          },
          otherNonSecretInformation: {
            encrypted: false,
          },
        },
      };

      const password = 'superlongandsupersecretpassword';
      const secretInformation = 'asecretthatyoushouldnotknow';
      const otherNonSecretInformation = 'nonsecreInformation';
      const looksLikeSG = {
        name: 'MY_TEST_SG',
        version: '1.0.0',
        context: {
          password,
          secretInformation,
          otherNonSecretInformation,
        },
      };

      GlobalConfig.destroy({ truncate: true, force: true })
      .then(() => generatorUtils.encryptSGContextValues(GlobalConfig,
        looksLikeSG, looksLikeSGT))
      .then(() => {
        done('Expecting unable to save this Sample Generator Error');
      })
      .catch((err) => {
        expect(err).to.contain('Cannot encrypt the text without the ' +
          'secretKey and algorithm');
        done();
      })
      ;
    });

    it('when SGEncryptionAlgorithm is not found, encryption should ' +
      'not happen', (done) => {
      const looksLikeSGT = {
        name: 'My_TEST_SGT',
        version: '1.0.0',
        contextDefinition: {
          password: {
            encrypted: true,
          },
          secretInformation: {
            encrypted: true,
          },
          otherNonSecretInformation: {
            encrypted: false,
          },
        },
      };

      const password = 'superlongandsupersecretpassword';
      const secretInformation = 'asecretthatyoushouldnotknow';
      const otherNonSecretInformation = 'nonsecreInformation';
      const looksLikeSG = {
        name: 'MY_TEST_SG',
        version: '1.0.0',
        context: {
          password,
          secretInformation,
          otherNonSecretInformation,
        },
      };

      GlobalConfig.find({
        where: {
          key: dbConstants.SGEncryptionAlgorithm,
          value: algorithm,
        },
      })
      .then((o) => o.destroy())
      .then(() => generatorUtils.encryptSGContextValues(GlobalConfig,
        looksLikeSG, looksLikeSGT))
      .then(() => {
        done('Expecting unable to save this Sample Generator Error');
      })
      .catch((err) => {
        expect(err).to.contain('Cannot encrypt the text without the ' +
            'secretKey and algorithm');
        done();
      });
    });
  });
});

