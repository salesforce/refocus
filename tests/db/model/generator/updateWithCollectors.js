/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/updateWithCollectors.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Generator = tu.db.Generator;
const Collector = tu.db.Collector;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const GlobalConfig = tu.db.GlobalConfig;
const cryptUtils = require('../../../../utils/cryptUtils');
const constants = require('../../../../db/constants');
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;
const testStartTime = new Date();

describe('tests/db/model/generator/updateWithCollectors.js >', () => {
  const generator = u.getGenerator();
  const generatorTemplate = gtUtil.getGeneratorTemplate();

  let generatorDBInstance;
  let sgtDBInstance;
  let collector1 = { name: 'hello', version: '1.0.0' };
  let collector2 = { name: 'beautiful', version: '1.0.0' };
  let collector3 = { name: 'world', version: '1.0.0' };

  before((done) => {
    GeneratorTemplate.create(generatorTemplate)
    .then((o) => {
      sgtDBInstance = o;
      return Promise.all([
        Collector.create(collector1),
        Collector.create(collector2),
        Collector.create(collector3),
      ]);
    })
    .then((collectors) => {
      collector1 = collectors[ZERO];
      collector2 = collectors[ONE];
      collector3 = collectors[TWO];
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Generator.create(generator)
    .then((o) => {
      generatorDBInstance = o;
      return o.addCollectors([collector1]);
    })
    .then(() => done())
    .catch(done);
  });

  // delete generator after each test
  afterEach(() => tu.forceDelete(tu.db.Generator, testStartTime));
  after(u.forceDelete);
  after(gtUtil.forceDelete);

  it('update without collectors field should preserve the collectors', (done) => {
    generatorDBInstance
    .updateWithCollectors({ name: 'New_Name' }, u.whereClauseForNameInArr)
    .then((o) => {
      expect(o.name).to.equal('New_Name');

      // check collector is still there
      expect(Array.isArray(o.collectors)).to.be.true;
      expect(o.collectors.length).to.equal(ONE);
      done();
    })
    .catch(done);
  });

  it('ok: update to a collector that is already attached to the generator', (done) => {
    generatorDBInstance
    .updateWithCollectors({ collectors: [collector1.name] }, u.whereClauseForNameInArr)
    .then((o) => {
      expect(Array.isArray(o.collectors)).to.be.true;
      expect(o.collectors.length).to.equal(ONE);
      done();
    })
    .catch(done);
  });

  it('ok: update to add new collectors', (done) => {
    generatorDBInstance
    .updateWithCollectors({ collectors: [collector2.name, collector3.name] },
      u.whereClauseForNameInArr)
    .then((o) => {
      expect(Array.isArray(o.collectors)).to.be.true;
      expect(o.collectors.length).to.equal(THREE);
      const collectorNames = o.collectors.map((collector) => collector.name);
      expect(collectorNames).to.contain(collector1.name);
      expect(collectorNames).to.contain(collector2.name);
      expect(collectorNames).to.contain(collector3.name);
      done();
    })
    .catch(done);
  });

  it('400 error with duplicate collectors in request body', (done) => {
    const _collectors = [collector1.name, collector1.name];
    generatorDBInstance.updateWithCollectors({
      collectors: _collectors,
    }, u.whereClauseForNameInArr)
    .then((o) => done(new Error('Expected DuplicateCollectorError, received', o)))
    .catch((err) => {
      expect(err.status).to.equal(u.BAD_REQUEST_STATUS_CODE);
      expect(err.name).to.equal('DuplicateCollectorError');
      expect(err.resourceType).to.equal('Collector');
      expect(err.resourceKey).to.deep.equal(_collectors);
      done();
    });
  });

  it('404 error for request body with an existing and a ' +
    'non-existant collector', (done) => {
    const _collectors = [collector1.name, 'iDontExist'];
    generatorDBInstance.updateWithCollectors({
      collectors: _collectors,
    }, u.whereClauseForNameInArr)
    .then((o) => done(new Error('Expected ResourceNotFoundError, received', o)))
    .catch((err) => {
      expect(err.status).to.equal(u.NOT_FOUND_STATUS_CODE);
      expect(err.name).to.equal('ResourceNotFoundError');
      expect(err.resourceType).to.equal('Collector');
      expect(err.resourceKey).to.deep.equal(_collectors);
      done();
    });
  });
});
