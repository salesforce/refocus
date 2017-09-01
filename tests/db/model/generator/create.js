/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/create.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const GlobalConfig = tu.db.GlobalConfig;
const cryptUtils = require('../../../../utils/cryptUtils');
const dbConstants = require('../../../../db/constants');

describe('tests/db/model/generator/create.js >', () => {
  const generator = JSON.parse(JSON.stringify(u.getGenerator()));
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  const gtWithEncryption = gtUtil.getGeneratorTemplate();
  gtWithEncryption.name = 'gtWithEncryption';
  gtWithEncryption.contextDefinition.password.encrypted = true;
  gtWithEncryption.contextDefinition.token.encrypted = true;

  let userInst;
  before((done) => {
    tu.createUser('GeneratorOwner')
    .then((user) => {
      userInst = user;
      generator.createdBy = user.id;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => GeneratorTemplate.create(gtWithEncryption))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(gtUtil.forceDelete);

  it('correct profile access field name', () => {
    expect(Generator.getProfileAccessField()).to.equal('generatorAccess');
  });

  it.skip('ok, create with one collectors field', (done) => {
    let collector;
    tu.db.Collector.create({ name: 'snow' })
    .then((_collector) => {
      collector = _collector;
      return Generator.create(generator)
    })
    // .then((gen) => gen.addCollectors([collector]))
    // .then((generatorCollectorEntry) => Generator
    //   .findOne({ where: { name: generator.name }}))
    // .then((findresult) => findresult.reload())
    // .then((result) => {
    //   expect(result.collectors.length).to.equal(1);
    //   done();
    // })
    .catch((err) => {
      console.log(err)
      done(err)
    });
  });

//       return o.getWriters();
    // })
    // .then((writers) => {

  it('ok, create with two collectors field', (done) => {
    const generatorCopy = JSON.parse(JSON.stringify(u.getGenerator()));
    generatorCopy.name = 'two collectors';
    let collector1;
    let collector2;
    Promise.all([
      tu.db.Collector.create({ name: 'hello' }),
      tu.db.Collector.create({ name: 'world' }),
    ])
    // .then((collectors) => {
    //   collector1 = collectors[0];
    //   collector2 = collectors[1];
    //   return Generator.create(generatorCopy);
    // })
    // .then((gen) => gen.addCollectors([collector1, collector2]))
    // .then((generatorCollectorEntry) => Generator
    //   .findOne({ where: { name: generatorCopy.name }}))
    // .then((findresult) => findresult.reload())
    // .then((result) => {
    //   expect(result.collectors.length).to.equal(2);
    //   done();
    // })
    .catch(done);
  });

  it('ok, create with all fields', (done) => {
    Generator.create(generator)
    .then((o) => {
      expect(o.collectors).to.be.undefined;
      expect(o.id).to.not.equal(undefined);
      expect(o.name).to.equal(generator.name);
      expect(o.description).to.equal(generator.description);
      expect(o.tags).to.deep.equal(generator.tags);
      expect(o.context).to.deep.equal(generator.context);
      expect(o.helpUrl).to.equal(generator.helpUrl);
      expect(o.helpEmail).to.equal(generator.helpEmail);
      expect(o.createdBy).to.equal(generator.createdBy);
      expect(o.isActive).to.equal(false);
      expect(o.generatorTemplate.name).to.equal('refocus-ok-template');
      expect(o.generatorTemplate.version).to.equal('1.0.0');
      expect(typeof o.getWriters).to.equal('function');
      expect(typeof o.getCollectors).to.equal('function');
      done();
    })
    .catch(done);
  });

  it('ok, create should set the creater as the sole writer ', (done) => {
    generator.name += 'soleWriter';
    Generator.create(generator)
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      expect(o.createdBy).to.equal(generator.createdBy);
      return o.getWriters();
    })
    .then((writers) => {
      expect(writers.length).to.equal(1);
      expect(writers[0].id).to.equal(userInst.id);
      expect(writers[0].email).to.equal(userInst.email);
      expect(writers[0].name).to.equal(userInst.name);
      expect(writers[0].GeneratorWriters).to.not.equal(null);
      done();
    })
    .catch(done);
  });

  it('ok, isWritableBy should return true for createdBy user', (done) => {
    generator.name += 'isWritableBy';
    Generator.create(generator)
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      return o.isWritableBy(o.createdBy);
    })
    .then((ret) => {
      expect(ret).to.equal(true);
      done();
    })
    .catch(done);
  });

  it('ok, no writers when createdBy is not specified', (done) => {
    const _g = JSON.parse(JSON.stringify(generator));
    _g.name += 'withNoCreatedBy';
    delete _g.createdBy;
    Generator.create(_g)
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      expect(o.createdBy).to.equal(null);
      return o.getWriters();
    })
    .then((writers) => {
      expect(writers.length).to.equal(0);
      done();
    })
    .catch(done);
  });

  it('ok, create multiple generators', (done) => {
    generator.name = 'First';
    const gSecond = JSON.parse(JSON.stringify(generator));
    gSecond.name = 'Second';
    const gThird = JSON.parse(JSON.stringify(generator));
    gThird.name = 'Third';
    const gFourth = JSON.parse(JSON.stringify(generator));
    gFourth.name = 'Fourh';
    Generator.bulkCreate([generator, gSecond, gThird, gFourth])
    .then(() => Generator.findAll())
    .then((o) => {
      expect(o.length).to.be.at.least(4);
      done();
    })
    .catch(done);
  });

  it('not ok, name should be unique', (done) => {
    generator.name = 'Unique';
    Generator.create(generator)
    .then(() => Generator.create(generator))
    .then(() => {
      done('Expecting Unique Constraint Error');
    })
    .catch((err) => {
      expect(err.message).to.contain('Validation error');
      expect(err.name).to.contain('SequelizeUniqueConstraintError');
      expect(err.errors[0].message)
      .to.contain('lower(name::text) must be unique');
      done();
    });
  });

  it('version not ok, when version = 1.1.a', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    _generator.name += 'withVersionNotOK';
    _generator.generatorTemplate.version = '1.1.a';
    Generator.create(_generator)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.errors[0].message)
      .to.contain('The version must match the semantic version format');
      expect(err.name).to.contain('SequelizeValidationError');
      done();
    });
  });

  it('not ok, with both subjects and subjectQuery present in ' +
    'the generator schema', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    _generator.subjects = ['Asia, America'];
    _generator.subjectQuery = '?subjects=A*';
    _generator.name += 'bothSubSUbQPresent';
    Generator.create(_generator)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.message)
      .to.contain('Only one of ["subjects", "subjectQuery"] is required');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('eitherSubjectsORsubjectQuery');
      done();
    });
  });

  it('not ok, when both subjects and subjectQuery are not in ' +
    'generator schema', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    delete _generator.subjects;
    delete _generator.subjectQuery;
    _generator.name += 'bothSubSubQNotPresent';
    Generator.create(_generator)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.message)
      .to.contain('Only one of ["subjects", "subjectQuery"] is required');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('eitherSubjectsORsubjectQuery');
      done();
    });
  });

  it('not ok, cannot create a generator without a matching generator' +
    ' template', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    _generator.generatorTemplate.name = 'SomeRandomNameNotFoundInDb';
    Generator.create(_generator)
    .then(() => {
      done(' Error: Expecting GeneratorTemplate not found error');
    })
    .catch((err) => {
      expect(err.name).to.equal('ValidationError');
      expect(err.message).to.equal('No Generator Template matches ' +
        'name: SomeRandomNameNotFoundInDb and version: 1.0.0');
      done();
    });
  });

  it('not ok, cannot create a generator with encrypted filed ' +
    'when key/algo not found in global config', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    _generator.generatorTemplate.name = gtWithEncryption.name;
    Generator.create(_generator)
    .then(() => {
      done(' Error: Expecting GeneratorTemplate not found error');
    })
    .catch((err) => {
      expect(err.name).to.equal('SampleGeneratorContextEncryptionError');
      expect(err.message).to.equal('Unable to save this Sample Generator ' +
        'with encrypted context data. Please contact your Refocus ' +
        'administrator to set up the encryption algorithm and key to ' +
        'protect any sensitive information you may include in ' +
        'your Sample Generator\'s context');
      done();
    });
  });

  describe('with GlobalConfig rows with key and algorithm added', () => {
    const secretKey = 'mySecretKey';
    const algorithm = 'aes-256-cbc';
    before((done) => {
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

    after((done) => {
      GlobalConfig.destroy({ truncate: true, force: true })
      .then(() => done())
      .catch(done);
    });

    it('ok, with globalConfig entry for SGKey and SGAlgorithm, context ' +
      'values should be encrypted', (done) => {
      const _g = JSON.parse(JSON.stringify(generator));
      _g.name += 'withGolbalConfig';
      _g.generatorTemplate.name = gtWithEncryption.name;
      const password = _g.context.password;
      const token = _g.context.token;

      Generator.create(_g)
      .then((o) => {
        expect(o.id).to.not.equal(undefined);
        expect(o.name).to.equal(_g.name);
        expect(o.description).to.equal(_g.description);
        expect(o.tags).to.deep.equal(_g.tags);
        expect(o.helpUrl).to.equal(_g.helpUrl);
        expect(o.helpEmail).to.equal(_g.helpEmail);
        expect(o.createdBy).to.equal(_g.createdBy);
        expect(o.isActive).to.equal(false);
        expect(o.generatorTemplate.name).to.equal('gtWithEncryption');
        expect(o.generatorTemplate.version).to.equal('1.0.0');
        expect(typeof o.getWriters).to.equal('function');
        expect(typeof o.getCollectors).to.equal('function');
        return cryptUtils
          .decryptSGContextValues(GlobalConfig, o, gtWithEncryption);
      })
      .then((o) => {
        expect(o.context.password).to.equal(password);
        expect(o.context.token).to.equal(token);
        return o.update({ context: { password: 'newPassword' }, });
      })
      .then((o) => cryptUtils
        .decryptSGContextValues(GlobalConfig, o, gtWithEncryption))
      .then((o) => {
        expect(o.context.token).to.equal(undefined);
        expect(o.context.password).to.deep.equal('newPassword');
        done();
      })
      .catch(done);
    });
  });

  describe('GlobalConfig rows with wrong encrytion algorithm', () => {
    const secretKey = 'mySecretKey';
    const algorithm = 'aes-256-invalid-algorithm';
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

    it('not ok, should throw an error when trying to encrypt with ' +
      'wrong algorithm', (done) => {
      const _g = JSON.parse(JSON.stringify(generator));
      _g.name += 'withGolbalConfig';
      _g.generatorTemplate.name = gtWithEncryption.name;

      Generator.create(_g)
      .then(() => {
        done(' Error: Expecting GeneratorTemplate not found error');
      })
      .catch((err) => {
        expect(err.name).to.equal('SampleGeneratorContextEncryptionError');
        expect(err.message).to.equal('Unable to save this Sample Generator ' +
          'with encrypted context data. Please contact your Refocus ' +
          'administrator to set up the encryption algorithm and key to ' +
          'protect any sensitive information you may include in ' +
          'your Sample Generator\'s context');
        done();
      });
    });
  });
});
