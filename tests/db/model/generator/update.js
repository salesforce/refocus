/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/update.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
require('chai').use(require('chai-as-promised')).should();
const tu = require('../../../testUtils');
const u = require('./utils');
const sinon = require('sinon');
const gtUtil = u.gtUtil;
const Generator = tu.db.Generator;
const Collector = tu.db.Collector;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const GlobalConfig = tu.db.GlobalConfig;
const cryptUtils = require('../../../../utils/cryptUtils');
const constants = require('../../../../db/constants');
const collectorStatuses = require('../../../../db/constants').collectorStatuses;

describe('tests/db/model/generator/update.js >', () => {
  const generator = u.getGenerator();
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  const gtWithEncryption = gtUtil.getGeneratorTemplate();
  gtWithEncryption.name = 'gtWithEncryption';
  gtWithEncryption.contextDefinition.password.encrypted = true;
  gtWithEncryption.contextDefinition.token.encrypted = true;

  const gtWithRequiredContextDef = gtUtil.getGeneratorTemplate();
  gtWithRequiredContextDef.name = 'gtWithRequiredContextDef';
  gtWithRequiredContextDef.contextDefinition.newRequireField = {
    required: true,
    description: 'New field for contextDefinition',
  };

  let generatorDBInstance;
  let sgtDBInstance;
  let collectorObj1 = {
    name: 'collector1',
    version: '1.0.0',
  };
  let collectorObj2 = {
    name: 'collector2',
    version: '1.0.0',
  };
  before((done) => {
    GeneratorTemplate.create(gtWithEncryption)
    .then(() => GeneratorTemplate.create(gtWithRequiredContextDef))
    .then(() => GeneratorTemplate.create(generatorTemplate))
    .then((o) => {
      sgtDBInstance = o;
      return Generator.create(generator);
    })
    .then((o) => {
      generatorDBInstance = o;
    })
    .then(() => Collector.create(collectorObj1))
    .then((c) => {
      collectorObj1 = c;
      generatorDBInstance.addPossibleCollector(c.id);
      return Collector.create(collectorObj2);
    })
    .then((c) => {
      collectorObj2 = c;
      generatorDBInstance.addPossibleCollector(c.id);
      done();
    }).catch(done);
  });

  after(u.forceDelete);
  after(gtUtil.forceDelete);

  it('ok, simple update should be fine', (done) => {
    generatorDBInstance.update({ name: 'New_Name' })
    .then(() => Generator.findById(generatorDBInstance.id))
    .then((o) => {
      expect(o.name).to.equal('New_Name');
      done();
    })
    .catch(done);
  });

  it('ok, context should not be encrypted when global config is not ' +
    'found', (done) => {
    generatorDBInstance.update({ context: { password: 'newPassword' } })
    .then(() => Generator.findById(generatorDBInstance.id))
    .then((o) => {
      expect(o.context.password).to.equal('newPassword');
      done();
    })
    .catch(done);
  });

  it('ok, generator template version must accept semver format ' +
    'with ^', (done) => {
    sgtDBInstance.update({ name: 'newName', version: '1.0.0' })
    .then(() => generatorDBInstance.update({
      generatorTemplate: {
        name: 'newName',
        version: '^1.0.0',
      },
    }))
    .then(() => Generator.findById(generatorDBInstance.id))
    .then((o) => {
      expect(o.generatorTemplate.version).to.equal('^1.0.0');
      expect(o.generatorTemplate.name).to.equal('newName');
      done();
    })
    .catch(done);
  });

  it('not ok, generator cannot be updated without the required context ' +
    'definition attribute defined in the generator template', (done) => {
    generatorDBInstance.update({
      generatorTemplate: {
        name: gtWithRequiredContextDef.name,
        version: '1.0.0',
      },
    })
    .then(() => Generator.findById(generatorDBInstance.id))
    .then(() => {
      done('Expecting GeneratorTemplate not found error');
    })
    .catch((err) => {
      expect(err.name).to.equal('MissingRequiredFieldError');
      expect(err.explanation).to.equal('Missing the required generator ' +
        'context field newRequireField');
      done();
    });
  });

  it('not ok, generator cannot be updated when generator template ' +
    'is not found', (done) => {
    generatorDBInstance.update({
      generatorTemplate: {
        name: 'newName',
        version: '^99.0.0',
      },
    })
    .then(() => Generator.findById(generatorDBInstance.id))
    .then(() => {
      done('Expecting GeneratorTemplate not found error');
    })
    .catch((err) => {
      expect(err.name).to.equal('ValidationError');
      expect(err.message).to.equal('No Generator Template matches name: ' +
        'newName and version: ^99.0.0');
      done();
    });
  });

  it('ok, generator template version must accept semver format ' +
    'with >=', (done) => {
    sgtDBInstance.update({ name: 'newName', version: '1.2.0' })
    .then(() => generatorDBInstance.update({
      generatorTemplate: {
        name: 'newName',
        version: '>=1.1.0',
      },
    }))
    .then(() => Generator.findById(generatorDBInstance.id))
    .then((o) => {
      expect(o.generatorTemplate.version).to.equal('>=1.1.0');
      expect(o.generatorTemplate.name).to.equal('newName');
      done();
    })
    .catch(done);
  });

  it('ok, generator template version must accept semver format ' +
    'with alpha beta', (done) => {
    sgtDBInstance.update({ name: 'newName', version: '1.2.3' })
    .then(() => generatorDBInstance.update({
      generatorTemplate: {
        name: 'newName',
        version: '^1.2.3-alpha.10.beta',
      },
    }))
    .then(() => Generator.findById(generatorDBInstance.id))
    .then((o) => {
      expect(o.generatorTemplate.version).to.equal('^1.2.3-alpha.10.beta');
      expect(o.generatorTemplate.name).to.equal('newName');
      done();
    })
    .catch(done);
  });

  it('ok, generators should have the associated collectors', (done) => {
    Generator.findById(generatorDBInstance.id)
    .then((o) => o.getPossibleCollectors())
    .then((collectors) => {
      expect(collectors.length).to.equal(2);
      expect(collectors[0].name).to.contain('collector');
      expect(collectors[1].name).to.contain('collector');
      done();
    })
    .catch(done);
  });

  it('not ok, name validation should run on updates', (done) => {
    const longName = 'Name'.repeat(constants.fieldlen.normalName);
    generatorDBInstance.update({ name: longName })
    .then(() => {
      done('Expecting Validation Error');
    })
    .catch((err) => {
      expect(err.message).to.contain('value too long');
      expect(err.name).to.contain('SequelizeDatabaseError');
      done();
    });
  });

  it('not ok, run helpEmail and name validation on update', (done) => {
    const invalidName = 'Name$$$';
    const invalidHelpEmail = 'email.com';
    generatorDBInstance.update({
      name: invalidName,
      helpEmail: invalidHelpEmail,
    })
    .then(() => {
      done('Expecting Validation Error');
    })
    .catch((err) => {
      expect(err.message).to.contain(
        'Validation error: Validation is on name failed'
      );
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors.length).to.equal(2);
      done();
    });
  });

  it('not ok, invalid negative intervalSecs', (done) => {
    generatorDBInstance.update({
      intervalSecs: -1,
    })
    .then(() => done(new Error('Expecting Validation Error')))
    .catch((err) => {
      expect(err.message).to.contain(
        'Validation error: Validation min on intervalSecs failed'
      );
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors.length).to.equal(1);
      done();
    });
  });

  it('not ok, invalid non-integer intervalSecs', (done) => {
    generatorDBInstance.update({
      intervalSecs: 'abcd',
    })
    .then(() => done(new Error('Expecting Validation Error')))
    .catch((err) => {
      expect(err.message).to.contain(
        'Validation error: Validation isInt on intervalSecs failed'
      );
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors.length).to.equal(1);
      done();
    });
  });

  it('not ok, cannot switch to a generatorTemplate that has encrypted ' +
    'fields when global config key and algo pair is not set', (done) => {
    generatorDBInstance.update({
      generatorTemplate: {
        name: gtWithEncryption.name,
        version: '1.0.0',
      },
    })
    .then(() => {
      done('Expecting Validation Error');
    })
    .catch((err) => {
      expect(err.message).to.equal('Unable to save this Sample Generator ' +
        'with encrypted context data. Please contact your Refocus ' +
        'administrator to set up the encryption algorithm and key to ' +
        'protect any sensitive information you may include in ' +
        'your Sample Generator\'s context');
      expect(err.name).to.contain('SampleGeneratorContextEncryptionError');
      done();
    });
  });

  describe('changing isActive reassigns collector > ', () => {
    let clock;
    let now = Date.now();

    beforeEach(() => {
      clock = sinon.useFakeTimers(now);
      return collectorObj1.update({
        lastHeartbeat: now,
        status: collectorStatuses.Running,
      });
    });

    afterEach(() => clock.restore());

    it('turning on isActive assigns to a collector', () => {
      const gen = generatorDBInstance;
      return gen.reload()
      .then(() => gen.update({ isActive: false }, { validate: false, hooks: false }))
      .then(() => expect(gen.currentCollector).to.equal(null))
      .then(() => gen.update({ isActive: true }))
      .then(() => expect(gen.currentCollector.name).to.equal(collectorObj1.name))
      .then(() => expect(gen.currentCollector.id).to.equal(collectorObj1.id));
    });

    it('turning off isActive unassigns the generator', () => {
      const gen = generatorDBInstance;
      return gen.reload()
      .then(() => gen.update({ isActive: true }, { validate: false, hooks: false }))
      .then(() => expect(gen.currentCollector.name).to.equal(collectorObj1.name))
      .then(() => expect(gen.currentCollector.id).to.equal(collectorObj1.id))
      .then(() => gen.update({ isActive: false }))
      .then(() => expect(gen.currentCollector).to.equal(null));
    });
  });

  describe('isActive validation', () => {
    function doUpdate(changes) {
      const initialCollectorsValue = changes.possibleCollectors.initial;
      const initialIsActiveValue = {
        isActive: changes.isActive.initial,
      };
      const updateValues = {
        possibleCollectors: changes.possibleCollectors.update,
        isActive: changes.isActive.update,
      };

      return Promise.resolve()
      .then(() => Generator.findById(generatorDBInstance.id))
      .then((gen) => gen.update(initialIsActiveValue, { validate: false }))
      .then(() => Generator.findById(generatorDBInstance.id))
      .then((gen) => gen.setPossibleCollectors(initialCollectorsValue))
      .then(() => Generator.findById(generatorDBInstance.id))
      .then((gen) => {
        if (updateValues.isActive !== undefined) {
          return gen.update({ isActive: updateValues.isActive });
        } else if (updateValues.possibleCollectors !== undefined) {
          return gen.setPossibleCollectors(updateValues.possibleCollectors);
        }
      });
    }

    it('existing collectors, set isActive', () =>
      doUpdate({
        possibleCollectors: { initial: [collectorObj1], },
        isActive: { initial: false, update: true, },
      }).should.eventually.be.fulfilled
    );

    it('existing collectors, unset isActive', () =>
      doUpdate({
        possibleCollectors: { initial: [collectorObj1], },
        isActive: { initial: true, update: false, },
      }).should.eventually.be.fulfilled
    );

    it('no existing collectors, set isActive', () =>
      doUpdate({
        possibleCollectors: { initial: [], },
        isActive: { initial: false, update: true, },
      }).should.eventually.be.rejectedWith(
        'isActive can only be turned on if at least one collector is specified.'
      )
    );

    it('no existing collectors, unset isActive', () =>
      doUpdate({
        possibleCollectors: { initial: [], },
        isActive: { initial: true, update: false, },
      }).should.eventually.be.fulfilled
    );

    it('isActive=false, set collectors', () =>
      doUpdate({
        isActive: { initial: false },
        possibleCollectors: { initial: [], update: [collectorObj1] },
      }).should.eventually.be.fulfilled
    );

    it('isActive=false, unset collectors', () =>
      doUpdate({
        isActive: { initial: false },
        possibleCollectors: { initial: [collectorObj1], update: [] },
      }).should.eventually.be.fulfilled
    );

    it('isActive=true, set collectors', () =>
      doUpdate({
        isActive: { initial: true },
        possibleCollectors: { initial: [], update: [collectorObj1] },
      }).should.eventually.be.fulfilled
    );

    it('isActive=true, unset collectors', () =>
      doUpdate({
        isActive: { initial: true },
        possibleCollectors: { initial: [collectorObj1], update: [] },
      }).should.eventually.be.fulfilled
    );
  });

  describe('with GlobalConfig for SG/SGT added > ', () => {
    const secretKey = 'mySecretKey';
    const algorithm = 'aes-256-cbc';
    before((done) => {
      GlobalConfig.create({
        key: constants.SGEncryptionKey,
        value: secretKey,
      })
      .then(() => GlobalConfig.create({
        key: constants.SGEncryptionAlgorithm,
        value: algorithm,
      }))
      .then(() => done())
      .catch(done);
    });

    after((done) => {
      GlobalConfig.destroy({ truncate: true, force: true })
      .then(() => done())
      .catch(done);
    });

    it('ok, updating the encrypted=true fields should be fine', (done) => {
      sgtDBInstance.update({ name: 'newName', version: '1.2.0' })
      .then(() => generatorDBInstance.update({
        generatorTemplate: {
          name: gtWithEncryption.name,
          version: '1.0.0',
        },
        context: {
          password: 'newPassword',
          token: 'newToken',
        },
      }))
      .then(() => Generator.findById(generatorDBInstance.id))
      .then((o) => {
        expect(o.generatorTemplate.version).to.equal('1.0.0');
        expect(o.generatorTemplate.name).to.equal(gtWithEncryption.name);

        /*
         * the two asserts below, prove that the fields that require encryption
         * are stored encrypted in the database.
         */
        expect(o.context.password).to.not.equal('newPassword');
        expect(o.context.token).to.not.equal('newToken');
        return cryptUtils
          .decryptSGContextValues(GlobalConfig, o, gtWithEncryption);
      })
      .then((o) => {
        expect(o.context.password).to.equal('newPassword');
        expect(o.context.token).to.equal('newToken');
        done();
      })
      .catch(done);
    });
  });
});
