/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/create.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const GeneratorTemplate = tu.db.GeneratorTemplate;
const constants = require('../../../../db/constants');

describe('db: Generatortemplate: create: ', () => {
  const gt = u.getGeneratorTemplate();

  afterEach(u.forceDelete);

  it('ok, create with all fields', (done) => {
    GeneratorTemplate.create(gt)
    .then((o) => {
      expect(o.id).to.not.equal(undefined);
      expect(o.isPublished).to.equal(false);
      expect(o.version).to.equal('1.0.0');
      expect(o.name).to.equal(gt.name);
      expect(o.description).to.equal(gt.description);
      expect(o.author).to.deep.equal(gt.author);
      expect(o.repository).to.deep.equal(gt.repository);
      expect(o.connection).to.deep.equal(gt.connection);
      expect(o.keywords).to.deep.equal(gt.keywords);
      expect(o.transform).to.deep.equal(gt.transform);
      expect(o.contextDefinition).to.deep.equal(gt.contextDefinition);
      expect(o.helpUrl).to.deep.equal(gt.helpUrl);
      expect(o.helpEmail).to.deep.equal(gt.helpEmail);
      done();
    })
    .catch(done);
  });

  it('ok, create multiple generator templates', (done) => {
    const gtSecond = JSON.parse(JSON.stringify(gt));
    gtSecond.name = 'Second';
    const gtThird = JSON.parse(JSON.stringify(gt));
    gtThird.name = 'Third';
    const gtFourth = JSON.parse(JSON.stringify(gt));
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
    const _gt = JSON.parse(JSON.stringify(gt));
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
      expect(err.errors[0].message).to.contain('name must be unique');
      expect(err.errors[1].message).to.contain('version must be unique');
      done();
    });
  });

  it('version not ok, when version = 11', (done) => {
    const _gt = JSON.parse(JSON.stringify(gt));
    _gt.version = '11';
    GeneratorTemplate.create(_gt)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.message).to.contain('Validation error: Validation is failed');
      expect(err.name).to.contain('SequelizeValidationError');
      done();
    });
  });

  it('version not ok, when version = 1.1.2a', (done) => {
    const _gt = JSON.parse(JSON.stringify(gt));
    _gt.version = '1.1.2a';
    GeneratorTemplate.create(_gt)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.message).to.contain('Validation error: Validation is failed');
      expect(err.name).to.contain('SequelizeValidationError');
      done();
    });
  });

  it('not ok, with bad name and helpEmail', (done) => {
    const _gt = JSON.parse(JSON.stringify(gt));
    _gt.name = 'Name$$$';
    _gt.helpEmail = 'email.com';
    GeneratorTemplate.create(_gt)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.message).to.contain('Validation error: Validation is failed');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors.length).to.equal(2);
      done();
    });
  });

  it('not ok, with really long author name, invalid url and ' +
    'email', (done) => {
    const _gt = JSON.parse(JSON.stringify(gt));
    _gt.author.name = 'Name'.repeat(constants.fieldlen.normalName);
    _gt.author.email = 'notanemail';
    _gt.author.url = 'invalid url';
    GeneratorTemplate.create(_gt)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.message).to.contain('maximum is 60 characters');
      expect(err.message).to.contain('is not a valid email');
      expect(err.message).to.contain('is not a valid url');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('author');
      done();
    });
  });

  it('not ok, with invalid repository schema', (done) => {
    const _gt = JSON.parse(JSON.stringify(gt));
    _gt.repository.type = 'ty'.repeat(constants.fieldlen.normalName);
    GeneratorTemplate.create(_gt)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.message).to.contain('maximum is 60 characters');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('repository');
      done();
    });
  });

  it('not ok, with invalid connection method type', (done) => {
    const _gt = JSON.parse(JSON.stringify(gt));
    _gt.connection.method = 'SPY';
    GeneratorTemplate.create(_gt)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.message).to.contain('must be present in given enumerator');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('connection');
      done();
    });
  });

  it('not ok, with contextDefinition key not having description', (done) => {
    const _gt = JSON.parse(JSON.stringify(gt));
    _gt.contextDefinition.pod = { required: true };
    GeneratorTemplate.create(_gt)
    .then(() => {
      done(' Error: Expecting validation error');
    })
    .catch((err) => {
      expect(err.message).to.contain('description is required');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('contextDefinition');
      done();
    });
  });
});
