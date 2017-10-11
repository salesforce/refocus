/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generatortemplate/create.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const GeneratorTemplate = tu.db.GeneratorTemplate;
const constants = require('../../../../db/constants');

describe('tests/db/model/generatortemplate/create.js >', () => {
  const gt = u.getGeneratorTemplate();
  let userInst;
  beforeEach((done) => {
    tu.createUser('GTOwner')
    .then((user) => {
      userInst = user;
      gt.createdBy = user.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('correct profile access field name', () => {
    expect(GeneratorTemplate.getProfileAccessField())
    .to.equal('generatorTemplateAccess');
  });

  it('ok, create with all fields', (done) => {
    GeneratorTemplate.create(gt)
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      expect(o.isPublished).to.equal(true);
      expect(o.version).to.equal('1.0.0');
      expect(o.name).to.equal(gt.name);
      expect(o.description).to.equal(gt.description);
      expect(o.author).to.deep.equal(gt.author);
      expect(o.repository).to.deep.equal(gt.repository);
      expect(o.connection).to.deep.equal(gt.connection);
      expect(o.tags).to.deep.equal(gt.tags);
      expect(o.transform).to.deep.equal(gt.transform);
      expect(o.contextDefinition).to.deep.equal(gt.contextDefinition);
      expect(o.helpUrl).to.equal(gt.helpUrl);
      expect(o.helpEmail).to.equal(gt.helpEmail);
      expect(o.createdBy).to.equal(gt.createdBy);
      done();
    })
    .catch(done);
  });

  it('ok, create should set the creater as the sole writer ', (done) => {
    GeneratorTemplate.create(gt)
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      expect(o.createdBy).to.equal(gt.createdBy);
      return o.getWriters();
    })
    .then((writers) => {
      expect(writers.length).to.equal(1);
      expect(writers[0].id).to.equal(userInst.id);
      expect(writers[0].email).to.equal(userInst.email);
      expect(writers[0].name).to.equal(userInst.name);
      expect(writers[0].GeneratorTemplateWriters).to.not.equal(null);
      done();
    })
    .catch(done);
  });

  it('ok, isWritableBy should return true for createdBy user', (done) => {
    GeneratorTemplate.create(gt)
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
    const _gt = u.getGeneratorTemplate();
    delete _gt.createdBy;
    GeneratorTemplate.create(_gt)
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

  it('ok, create multiple generator templates', (done) => {
    const gtSecond = u.getGeneratorTemplate();
    gtSecond.name = 'Second';
    const gtThird = u.getGeneratorTemplate();
    gtThird.name = 'Third';
    const gtFourth = u.getGeneratorTemplate();
    gtFourth.name = 'Fourh';
    GeneratorTemplate.bulkCreate([gt, gtSecond, gtThird, gtFourth])
    .then(() => GeneratorTemplate.findAll())
    .then((o) => {
      expect(o.length).to.equal(4);
      done();
    })
    .catch();
  });

  it('not ok, create with additional properties not part of the schema ' +
    'error', (done) => {
    const _gt = u.getGeneratorTemplate();
    _gt.connection.randomAttribute = 'random';
    GeneratorTemplate.create(_gt)
    .then(() => {
      done('Expecting Sequelize Validation Error');
    })
    .catch((err) => {
      expect(err.message).to.contain('randomAttribute');
      expect(err.errors[0].path).to.equal('connection');
      expect(err.name).to.contain('SequelizeValidationError');
      done();
    });
  });

  it('not ok, name and version should be unique', (done) => {
    GeneratorTemplate.create(gt)
    .then(() => GeneratorTemplate.create(gt))
    .then(() => {
      done('Expecting Unique Constraint Error');
    })
    .catch((err) => {
      expect(err.message).to.contain('Validation error');
      expect(err.name).to.contain('SequelizeUniqueConstraintError');
      expect(err.errors[0].message).to.contain('lower(name::text) ' +
        'must be unique');
      expect(err.errors[1].message).to.contain('version must be unique');
      done();
    });
  });

  it('version not ok, when version = 11', (done) => {
    const _gt = u.getGeneratorTemplate();
    _gt.version = '11';
    GeneratorTemplate.create(_gt)
    .then(() => done('Error: Expecting validation error'))
    .catch((err) => {
      expect(err.message).to.contain('Validation error: Validation is failed');
      expect(err.name).to.contain('SequelizeValidationError');
      done();
    });
  });

  it('version not ok, when version = 1.1.2a', (done) => {
    const _gt = u.getGeneratorTemplate();
    _gt.version = '1.1.2a';
    GeneratorTemplate.create(_gt)
    .then(() => done('Error: Expecting validation error'))
    .catch((err) => {
      expect(err.message).to.contain('Validation error: Validation is failed');
      expect(err.name).to.contain('SequelizeValidationError');
      done();
    });
  });

  it('not ok, with bad name and helpEmail', (done) => {
    const _gt = u.getGeneratorTemplate();
    _gt.name = 'Name$$$';
    _gt.helpEmail = 'email.com';
    GeneratorTemplate.create(_gt)
    .then(() => done('Error: Expecting validation error'))
    .catch((err) => {
      expect(err.message).to.contain('Validation error: Validation is failed');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors.length).to.equal(2);
      done();
    });
  });

  it('not ok, with really long author name, invalid url and ' +
    'email', (done) => {
    const _gt = u.getGeneratorTemplate();
    _gt.author.name = 'Name'.repeat(constants.fieldlen.normalName);
    _gt.author.email = 'notanemail';
    _gt.author.url = 'invalid url';
    GeneratorTemplate.create(_gt)
    .then(() => done('Error: Expecting validation error'))
    .catch((err) => {
      expect(err.message).to.contain('url');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('author');
      done();
    });
  });

  it('not ok, with invalid repository schema', (done) => {
    const _gt = u.getGeneratorTemplate();
    _gt.repository.type = 'ty'.repeat(constants.fieldlen.normalName);
    GeneratorTemplate.create(_gt)
    .then(() => done('Error: Expecting validation error'))
    .catch((err) => {
      expect(err.message).to.contain('60 characters');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('repository');
      done();
    });
  });

  it('not ok, with invalid connection method type', (done) => {
    const _gt = u.getGeneratorTemplate();
    _gt.connection.method = 'SPY';
    GeneratorTemplate.create(_gt)
    .then((x) => done('Error: Expecting validation error'))
    .catch((err) => {
      expect(err.message).to.contain('DELETE, GET, PATCH, POST, PUT');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('connection');
      done();
    });
  });

  it('not ok, with both toUrl and url present in connection schema', (done) => {
    const _gt = u.getGeneratorTemplate();
    _gt.connection.url = 'http://example.com';
    _gt.connection.toUrl = function () {
      return 'http://example.com';
    };

    GeneratorTemplate.create(_gt)
    .then(() => done('Error: Expecting validation error'))
    .catch((err) => {
      expect(err.message)
        .to.contain('Only one of ["url", "toUrl"] is required');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('eitherUrlORtoUrl');
      done();
    });
  });

  it('not ok, when both toUrl and url are not in connection schema', (done) => {
    const _gt = u.getGeneratorTemplate();
    delete _gt.connection.url;
    delete _gt.connection.toUrl;
    GeneratorTemplate.create(_gt)
    .then(() => done('Error: Expecting validation error'))
    .catch((err) => {
      expect(err.message)
        .to.contain('Only one of ["url", "toUrl"] is required');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('eitherUrlORtoUrl');
      done();
    });
  });

  it('not ok, with contextDefinition key not having description', (done) => {
    const _gt = u.getGeneratorTemplate();
    _gt.contextDefinition.pod = { required: true };
    GeneratorTemplate.create(_gt)
    .then(() => done('Error: Expecting validation error'))
    .catch((err) => {
      expect(err.message).to.contain('description is required');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('contextDefinition');
      done();
    });
  });
});
