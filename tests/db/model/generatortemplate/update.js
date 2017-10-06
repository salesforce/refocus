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
const genu = require('../generator/utils');
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const constants = require('../../../../db/constants');

describe('tests/db/model/generatortemplate/update.js >', () => {
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
      expect(err.message).to.contain('url');
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
      expect(err.message).to.contain('60 characters');
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
      expect(err.message).to.contain('[DELETE, GET, PATCH, POST, PUT]');
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

  describe('beforeUpdate unpublish >', () => {
    afterEach(u.forceDelete);

    it('unpublish ok if no SGs', (done) => {
      const gt = u.getGeneratorTemplate();
      gt.name += 'uoins';
      gt.isPublished = true;
      GeneratorTemplate.create(gt)
      .then((created) => created.update({ isPublished: false }))
      .then((updated) => {
        expect(updated).to.have.property('isPublished', false);
        done();
      })
      .catch(done);
    });

    it('unpublish ok if SG can semver match with another published version ' +
    'of this SGT', (done) => {
      const gt1 = u.getGeneratorTemplate();
      gt1.name += 'uoiscsmwapvots';
      gt1.version = '1.0.0';
      gt1.isPublished = true;
      const gt2 = u.getGeneratorTemplate();
      gt2.name += 'uoiscsmwapvots';
      gt2.version = '1.1.0';
      gt2.isPublished = true;
      const g = JSON.parse(JSON.stringify(genu.getGenerator()));
      g.name = 'sg-uoiscsmwapvots';
      g.generatorTemplate.name = gt1.name;
      g.generatorTemplate.version = '^1.0.0';
      g.isActive = true;
      let gtid;
      GeneratorTemplate.bulkCreate([gt1, gt2])
      .then((gtscreated) => {
        gtid = gtscreated[0].id;
        return Generator.create(g);
      })
      .then(() => GeneratorTemplate.findById(gtid))
      .then((gt) => gt.update({ isPublished: false }))
      .then((updated) => {
        expect(updated).to.have.property('isPublished', false);
        done();
      })
      .catch(done);
    });

    it('unpublish fail if SG can semver match with another version of this ' +
    'SGT but it is unpublished', (done) => {
      const gt1 = u.getGeneratorTemplate();
      gt1.name += 'uoiscsmwapvots';
      gt1.version = '1.0.0';
      gt1.isPublished = true;
      const gt2 = u.getGeneratorTemplate();
      gt2.name += 'uoiscsmwapvots';
      gt2.version = '1.1.0';
      gt2.isPublished = false;
      const g = JSON.parse(JSON.stringify(genu.getGenerator()));
      g.name = 'sg-uoiscsmwapvots';
      g.generatorTemplate.name = gt1.name;
      g.generatorTemplate.version = '^1.0.0';
      g.isActive = true;
      let gtid;
      GeneratorTemplate.bulkCreate([gt1, gt2])
      .then((gtscreated) => {
        gtid = gtscreated[0].id;
        return Generator.create(g);
      })
      .then(() => GeneratorTemplate.findById(gtid))
      .then((gt) => gt.update({ isPublished: false }))
      .then(() => done('uh oh... should have failed'))
      .catch((err) => {
        expect(err).to.have.property('name', 'ValidationError');
        done();
      });
    });

    it('unpublish fail if SG cannot semver match with another version of ' +
    'this SGT', (done) => {
      const gt1 = u.getGeneratorTemplate();
      gt1.name += 'uoiscsmwapvots';
      gt1.version = '1.0.0';
      gt1.isPublished = true;
      const gt2 = u.getGeneratorTemplate();
      gt2.name += 'uoiscsmwapvots';
      gt2.version = '1.1.0';
      gt2.isPublished = true;
      const g = JSON.parse(JSON.stringify(genu.getGenerator()));
      g.name = 'sg-uoiscsmwapvots';
      g.generatorTemplate.name = gt1.name;
      g.generatorTemplate.version = '^2.0.0';
      g.isActive = true;
      let gtid;
      GeneratorTemplate.bulkCreate([gt1, gt2])
      .then((gtscreated) => {
        gtid = gtscreated[0].id;
        return Generator.create(g);
      })
      .then(() => GeneratorTemplate.findById(gtid))
      .then((gt) => gt.update({ isPublished: false }))
      .then(() => done('uh oh... should have failed'))
      .catch((err) => {
        expect(err).to.have.property('name', 'ValidationError');
        done();
      });
    });
  });
});
