/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/getWithLimit.js
 */
'use strict';
const tu = require('../../../testUtils');
const u = require('./utils');
const getWithLimit = require('../common/getWithLimit.js').getWithLimit;
const Sample = tu.db.Sample;
const path = '/v1/samples';

describe('tests/api/v1/samples/getWithLimit.js >', () => {
  const modelList = [];

  before((done) => {
    const sampleObj = { value: '1' };
    tu.db.Subject.create(u.subjectToCreate)
    .then((s) => {
      sampleObj.subjectId = s.id;
      let aspectPromises = [];
      for (let i = 0; i < 10; i++) {
        const aspectObj = JSON.parse(JSON.stringify(u.aspectToCreate));
        aspectObj.name += i;
        aspectPromises.push(tu.db.Aspect.create(aspectObj));
      }

      return Promise.all(aspectPromises);
    })
    .then((createdAspects) => {
      for (let i = 0; i < 10; i++) {
        const toCreate = JSON.parse(JSON.stringify(sampleObj));
        toCreate.aspectId = createdAspects[i].id;
        toCreate.name += `-limitTest${i}-${i % 2 ? 'odd' : 'even'}`;
        modelList.push(toCreate);
      }

      return Sample.bulkCreate(modelList);
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  const skipWildcards = true;
  getWithLimit(path, skipWildcards);
});
