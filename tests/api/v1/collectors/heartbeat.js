/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/heartbeat.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const reEncryptSGContextValues = require(
  '../../../../api/v1/controllers/collectors'
).reEncryptSGContextValues;
const u = require('./utils');
const tu = require('../../../testUtils');
const expect = require('chai').expect;
const cryptUtils = require('../../../../utils/cryptUtils');
const GlobalConfig = tu.db.GlobalConfig;
const dbConstants = require('../../../../db/constants');
const config = require('../../../../config');
const jwtUtil = require('../../../../utils/jwtUtil');

describe('tests/api/v1/collectors/heartbeat.js >', () => {
  describe('basic >', () => {
    let token;
    let collectorToken;
    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });
    before((done) => {
      api.post('/v1/collectors')
      .set('Authorization', token)
      .send(u.toCreate)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        collectorToken = jwtUtil.createToken(u.toCreate.name, u.toCreate.name);
        return done();
      });
    });
    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    it('config ok', (done) => {
      api.post(`/v1/collectors/${u.toCreate.name}/heartbeat`)
      .set('Authorization', collectorToken)
      .send({})
      .expect((res) => {
        expect(res.body).to.have.property('collectorConfig');
        expect(res.body.collectorConfig)
        .to.have.property('heartbeatIntervalMillis', 15000);
        expect(res.body.collectorConfig)
        .to.have.property('sampleUpsertQueueTimeMillis', 15000);
        expect(res.body.collectorConfig)
        .to.have.property('maxSamplesPerBulkUpsert', 1000);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        return done();
      });
    });
  });

  describe('reEncryptSGContextValues >', () => {
    const secretKey = 'mySecretKey';
    const algorithm = 'aes-256-cbc';
    const password = 'superlongandsupersecretpassword';
    const secretInformation = 'asecretthatyoushouldnotknow';
    const otherNonSecretInformation = 'nonsecreInformation';
    const authToken = 'collectorAuthToken';
    const timestamp = Date.now().toString();

    let encryptedSG;
    beforeEach((done) => {
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

      const looksLikeSG = {
        name: 'MY_TEST_SG',
        version: '1.0.0',
        context: {
          password,
          secretInformation,
          otherNonSecretInformation,
        },
      };

      GlobalConfig.create({
        key: dbConstants.SGEncryptionKey,
        value: secretKey,
      })
      .then(() => GlobalConfig.create({
        key: dbConstants.SGEncryptionAlgorithm,
        value: algorithm,
      }))
      .then(() => cryptUtils.encryptSGContextValues(GlobalConfig,
          looksLikeSG, looksLikeSGT))
      .then((sg) => {
        encryptedSG = sg;
        encryptedSG.generatorTemplate = looksLikeSGT;

        done();
      }).catch(done);
    });

    afterEach((done) => {
      GlobalConfig.destroy({ truncate: true, force: true })
      .then(() => done())
      .catch(done);
    });

    it('when encrypted is set to true in SGT, the related encrypted SG values ' +
      'should be decrypted and encrypted again with given auth token and ' +
      'timestamp.', (done) => {
      let reencryptedSampleGen;
      const secretKeyColl = authToken + timestamp;

      // reencrypt context values
      reEncryptSGContextValues(encryptedSG, authToken, timestamp)
      .then((reencryptedSG) => {
        // verify the reencryptedSG context values
        reencryptedSampleGen = reencryptedSG;
        expect(reencryptedSG).to.not.equal(undefined);
        expect(reencryptedSG.context.secretInformation)
          .to.not.equal(encryptedSG.secretInformation);
        expect(reencryptedSG.context.otherNonSecretInformation)
          .equal(otherNonSecretInformation);
        expect(Object.keys(reencryptedSG)).to.deep
          .equal(Object.keys(encryptedSG));

        // decrypt the reencryptedSG, this would basically happen on collector
        const sg = reencryptedSG;
        const sgt = reencryptedSG.generatorTemplate;
        Object.keys(sgt.contextDefinition).forEach((key) => {
          if (sgt.contextDefinition[key].encrypted && sg.context[key]) {
            sg.context[key] = cryptUtils.decrypt(sg.context[key],
              secretKeyColl, config.encryptionAlgoForCollector);
          }
        });

        return sg;
      })
      .then((decryptedSG) => {
        // verify the decrypted context values
        expect(decryptedSG).to.not.equal(undefined);
        expect(decryptedSG.context.secretInformation)
          .equal(secretInformation);
        expect(decryptedSG.context.otherNonSecretInformation)
          .equal(otherNonSecretInformation);
        expect(Object.keys(decryptedSG)).to.deep
          .equal(Object.keys(reencryptedSampleGen));
        done();
      });
    });

    it('error when authToken null', (done) => {
      reEncryptSGContextValues(encryptedSG, null, timestamp)
      .then(() => done(new Error('Validation error should be thrown!')))
      .catch((err) => {
        expect(err.name).to.equal('ValidationError');
        expect(err.explanation).to.equal('Collector authentication token or ' +
          'timestamp not available to encrypt the context values');
        done();
      })
      .catch(done);
    });

    it('error when timestamp null/undefined', (done) => {
      reEncryptSGContextValues(encryptedSG, authToken)
      .then(() => done(new Error('Validation error should be thrown!')))
      .catch((err) => {
        expect(err.name).to.equal('ValidationError');
        expect(err.explanation).to.equal('Collector authentication token or ' +
          'timestamp not available to encrypt the context values');
        done();
      })
      .catch(done);
    });

    it('error when SGT not defined as an attribute of SG', (done) => {
      delete encryptedSG.generatorTemplate;
      reEncryptSGContextValues(encryptedSG, authToken, timestamp)
      .then(() => done(new Error('Validation error should be thrown!')))
      .catch((err) => {
        expect(err.name).to.equal('ValidationError');
        expect(err.explanation).to.equal('Sample generator template not found ' +
          'in sample generator.');
        done();
      })
      .catch(done);
    });

    it('error when key/algo is not present in GlobalConfig', (done) => {
      GlobalConfig.destroy({ truncate: true, force: true })
      .then(() => reEncryptSGContextValues(encryptedSG, authToken, timestamp))
      .then(() => done(new Error('Validation error should be thrown!')))
      .catch((err) => {
        expect(err.name).to.equal('SampleGeneratorContextDecryptionError');
        expect(err.message).to.equal('Unable to decrypt the Sample Generator ' +
          'context data. Please contact your Refocus administrator to set up ' +
          'the encryption algorithm and key to protect the ' +
          'sensitive information in your Sample Generator\'s context');
        done();
      })
      .catch(done);
    });

    it('cannot reencrypt SG context values when invalid algo present in ' +
      'GlobalConfig', (done) => {
      GlobalConfig.update(
        { value: 'aes-256-invalid-algo' },
        { where: { key: dbConstants.SGEncryptionAlgorithm } }
      )
      .then((gc) => reEncryptSGContextValues(encryptedSG, authToken, timestamp))
      .then(() => done(new Error('Validation error should be thrown!')))
      .catch((err) => {
        expect(err.name).to.equal('SampleGeneratorContextDecryptionError');
        expect(err.message).to.equal('Unable to decrypt the Sample Generator ' +
          'context data. Please contact your Refocus administrator to set up ' +
          'the encryption algorithm and key to protect the ' +
          'sensitive information in your Sample Generator\'s context');
        done();
      })
      .catch(done);
    });
  });
});
