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
require('chai').use(require('chai-as-promised')).should();
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const gUtil = require('../../../../db/helpers/generatorUtil');
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const GlobalConfig = tu.db.GlobalConfig;
const CollectorGroup = tu.db.CollectorGroup;
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

  it('ok, create with all fields', (done) => {
    Generator.create(generator)
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      expect(o.name).to.equal(generator.name);
      expect(o.description).to.equal(generator.description);
      expect(o.tags).to.deep.equal(generator.tags);
      expect(o.context).to.deep.equal(generator.context);
      expect(o.helpUrl).to.equal(generator.helpUrl);
      expect(o.helpEmail).to.equal(generator.helpEmail);
      expect(o.intervalSecs).to.equal(60);
      expect(o.createdBy).to.equal(generator.createdBy);
      expect(o.isActive).to.equal(false);
      expect(o.generatorTemplate.name).to.equal('refocus-ok-template');
      expect(o.generatorTemplate.version).to.equal('1.0.0');
      expect(typeof o.getWriters).to.equal('function');
      expect(typeof o.getPossibleCollectors).to.equal('function');
      done();
    })
    .catch(done);
  });

  it('ok, set collector group', (done) => {
    generator.name = tu.namePrefix + 'gen-test-cg';
    let collGroup;
    CollectorGroup.create({
      name: `${tu.namePrefix}test-collector-group`,
      description: 'This is test collector group',
    })
    .then((cg) => {
      collGroup = cg;
      return Generator.create(generator);
    })
    .then((g) => g.setCollectorGroup(collGroup))
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      expect(o.name).to.equal(generator.name);
      expect(o.collectorGroupId).to.equal(collGroup.id);
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
      .to.contain('version');
      expect(err.name).to.contain('SequelizeValidationError');
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

  it('not ok, cannot create a generator without providing fields required ' +
    'by the generator template contextDefinition', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    const _generatorTemplate = gtUtil.getGeneratorTemplate();
    _generatorTemplate.name = 'ExtraRequiredField';
    _generatorTemplate.contextDefinition.newRequireField = {
      required: true,
      description: 'New field for contextDefinition',
    };
    _generator.generatorTemplate.name = _generatorTemplate.name;

    GeneratorTemplate.create(_generatorTemplate)
    .then(() => Generator.create(_generator))
    .then(() => {
      done(' Error: Expecting GeneratorTemplate not found error');
    })
    .catch((err) => {
      expect(err.name).to.equal('MissingRequiredFieldError');
      expect(err.message).to.equal('An unexpected MissingRequiredFieldError' +
        ' occurred.');
      done();
    });
  });

  it('not ok, cannot create a generator with null context when context fields ' +
    'are marked required by the contextDefinition in the template', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    _generator.name = 'WithoutContextField';
    delete _generator.context;
    const _generatorTemplate = gtUtil.getGeneratorTemplate();
    _generatorTemplate.name = 'GTMAppedtoSGWithoutContext';
    _generatorTemplate.contextDefinition.newRequireField = {
      required: true,
      description: 'New field for contextDefinition',
    };
    _generator.generatorTemplate.name = _generatorTemplate.name;

    GeneratorTemplate.create(_generatorTemplate)
    .then(() => Generator.create(_generator))
    .then(() => {
      done(' Error: Expecting GeneratorTemplate not found error');
    })
    .catch((err) => {
      expect(err.name).to.equal('MissingRequiredFieldError');
      expect(err.message).to.equal('An unexpected MissingRequiredFieldError' +
        ' occurred.');
      done();
    });
  });

  it('not ok, cannot create generator with context field when no ' +
    'contextDefinition field is specified in the template', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    _generator.name = 'SGMappedToSGTWithoutCtxDef';
    const _generatorTemplate = gtUtil.getGeneratorTemplate();
    _generatorTemplate.name = 'TemplateWithoutContextDef';
    delete _generatorTemplate.contextDefinition;
    _generator.generatorTemplate.name = _generatorTemplate.name;

    GeneratorTemplate.create(_generatorTemplate)
    .then(() => Generator.create(_generator))
    .then((o) => {
      expect(o.name).to.equal(_generator.name);
      done();
    })
    .catch((err) => {
      expect(err.name).to.equal('ValidationError');
      expect(err.explanation).to.equal('Sample generator context contains ' +
        'invalid keys: okValue,password,token');
      done();
    });
  });

  it('not ok, cannot create a generator with encrypted field ' +
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

  it('not ok, cannot create generator with context keys that do not ' +
    'match the template contextDefinition keys', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    _generator.name = 'WithExtraContextFields';
    _generator.context.field = 'name';
    Generator.create(_generator)
    .then(() => {
      done(' Error: Expecting Generator to throw a validation error');
    })
    .catch((err) => {
      expect(err.name).to.equal('ValidationError');
      expect(err.explanation).to.equal('Sample generator context contains ' +
        'invalid keys: field');
      done();
    });
  });

  it('not ok, cannot create generator with invalid context keys', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    _generator.name = 'WithInvalidContextFields';
    _generator.context = {
      invalidField1: 'not valid',
      invalidField2: 'not valid',
      invalidField3: 'not valid',
    };

    Generator.create(_generator)
    .then(() => {
      done(' Error: Expecting Generator to throw a validation error');
    })
    .catch((err) => {
      expect(err.name).to.equal('ValidationError');
      expect(err.explanation).to.equal('Sample generator context contains ' +
        'invalid keys: invalidField1,invalidField2,invalidField3');
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
        expect(typeof o.getPossibleCollectors).to.equal('function');
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

  describe('isActive validation', () => {
    it('isActive=false, no collectors', () => {
      const gen = u.getGenerator();
      gen.name += 'isActive1';
      gen.isActive = false;
      return Generator.create(gen)
        .should.eventually.be.fulfilled;
    });

    it('isActive=true, no collectors', () => {
      const gen = u.getGenerator();
      gen.name += 'isActive2';
      gen.isActive = true;
      return Generator.create(gen)
        .should.eventually.be.rejectedWith(
          'isActive can only be turned on if at least one collector is specified.'
        );
    });
  });

  describe('subjectQuery validation', () => {
    it('valid subjectQuery', (done) => {
      const subjectQuery = '?absolutePath=Foo*&name=b*&tags=-T1,-T2';
      const returnSubjectQuery = gUtil.validateSubjectQuery(subjectQuery);
      expect(subjectQuery).to.equal(returnSubjectQuery);
      done();
    });

    it('invalid subjectQuery missing ? at start', (done) => {
      const subjectQuery = '?absolutePath=Foo*&name=b*?tags=-T1,-T2';

      try {
        gUtil.validateSubjectQuery(subjectQuery);
        done(new Error('expecting ValidationError'));
      } catch (err) {
        expect(err.message).to.equal('subjectQuery ValidationError');
        expect(err.name).to.equal('ValidationError');
        done();
      }
    });

    it('length of subjectQuery should be greater than 6', (done) => {
      const subjectQuery = '?abso';

      try {
        gUtil.validateSubjectQuery(subjectQuery);
        done(new Error('expecting ValidationError'));
      } catch (err) {
        expect(err.message).to.equal('subjectQuery ValidationError');
        expect(err.name).to.equal('ValidationError');
        done();
      }
    });

    it('format of subjectQuery is "?<key>=<value>"', (done) => {
      const subjectQuery = '?absolutePath:abc';

      try {
        gUtil.validateSubjectQuery(subjectQuery);
        done(new Error('expecting ValidationError'));
      } catch (err) {
        expect(err.message).to.equal('subjectQuery ValidationError');
        expect(err.name).to.equal('ValidationError');
        done();
      }
    });

    it('Wildcard "*" is prohibited in the subjectQuery for "tag" filters',
      (done) => {
      const subjectQuery = '?tags=abc*';
      try {
        gUtil.validateSubjectQuery(subjectQuery);
        done(new Error('expecting ValidationError'));
      } catch (err) {
        expect(err.message).to.equal('subjectQuery ValidationError');
        expect(err.name).to.equal('ValidationError');
        done();
      }
    });

    it('isPublished=false', (done) => {
      const subjectQuery = '?name=a&isPublished=false';

      try {
        gUtil.validateSubjectQuery(subjectQuery);
        done(new Error('expecting ValidationError'));
      } catch (err) {
        expect(err).to.have.property('message', 'subjectQuery ValidationError');
        expect(err).to.have.property('name', 'ValidationError');
        expect(err).to.have.property('explanation',
          'Cannot generate samples for subjects with isPublished=false');
        done();
      }
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
