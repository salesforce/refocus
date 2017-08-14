/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generatortemplate/update.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const GeneratorTemplate = tu.db.GeneratorTemplate;
const constants = require('../../../../db/constants');

describe('db: Generatortemplate: update: ', () => {
  const gt = u.getGeneratorTemplate();
  let gtDBInstance;
  before((done) => {
    GeneratorTemplate.create(gt)
    .then((o) => {
      gtDBInstance = o;
      done();
    });
  });
  after(u.forceDelete);

  it('ok, simple update should be fine', (done) => {
    gtDBInstance.update({ name: 'New_Name', version: '2.0.0' })
    .then(() => GeneratorTemplate.findById(gtDBInstance.id))
    .then((o) => {
      expect(o.name).to.equal('New_Name');
      expect(o.version).to.equal('2.0.0');
      done();
    })
    .catch(done);
  });

  it('not ok, name validation should run on updates', (done) => {
    const longName = 'Name'.repeat(constants.fieldlen.normalName);
    gtDBInstance.update({ name: longName })
    .then(() => {
      done('Expecting Validation Error');
    })
    .catch((err) => {
      expect(err.message).to.contain('value too long');
      expect(err.name).to.contain('SequelizeDatabaseError');
      done();
    });
  });

  it('not ok, version validation should run on updates', (done) => {
    const invalidVersion = 2;
    gtDBInstance.update({ version: invalidVersion })
    .then(() => {
      done('Expecting Validation Error');
    })
    .catch((err) => {
      expect(err.message).to.contain('Validation error: Validation is failed');
      expect(err.name).to.contain('SequelizeValidationError');
      done();
    });
  });

  it('not ok, run helpEmail and name validation on update', (done) => {
    const invalidName = 'Name$$$';
    const invalidHelpEmail = 'email.com';
    gtDBInstance.update({ name: invalidName, helpEmail: invalidHelpEmail })
    .then(() => {
      done('Expecting Validation Error');
    })
    .catch((err) => {
      expect(err.message).to.contain('Validation error: Validation is failed');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors.length).to.equal(2);
      done();
    });
  });

  it('not ok, should run author validation on update', (done) => {
    const invalidAuthor = {
      name: 'Name'.repeat(constants.fieldlen.normalName),
      email: 'notanemail',
      url: 'invalid url',
    };

    gtDBInstance.update({ author: invalidAuthor })
    .then(() => {
      done('Expecting Validation Error');
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

  it('not ok, should run repository schema validation on update', (done) => {
    const invalidRepo = {
      type: 'ty'.repeat(constants.fieldlen.normalName),
    };

    gtDBInstance.update({ repository: invalidRepo })
    .then(() => {
      done('Expecting Validation Error');
    })
    .catch((err) => {
      expect(err.message).to.contain('maximum is 60 characters');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('repository');
      done();
    });
  });

  it('not ok, should run connection validation on update', (done) => {
    const invalidConnection = {
      method: 'post',
    };
    gtDBInstance.update({ connection: invalidConnection })
    .then(() => {
      done('Expecting Validation Error');
    })
    .catch((err) => {
      expect(err.message).to.contain('must be present in given enumerator');
      expect(err.name).to.contain('SequelizeValidationError');
      expect(err.errors[0].path).to.equal('connection');
      done();
    });
  });

  it('not ok, contextDefinition validation should run on update', (done) => {
    const contextDefinition = {
      okStatus: 'OK',
    };
    gtDBInstance.update({ contextDefinition })
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
