/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/utils.js
 */
'use strict';

const tu = require('../../../testUtils');

const testStartTime = new Date();

const aspectToCreate = {
  description: 'this is a0 description',
  imageUrl: 'http://www.bar.com/a0.jpg',
  isPublished: true,
  name: `${tu.namePrefix}TEST_ASPECT`,
  timeout: '30s',
  valueLabel: 's',
  valueType: 'NUMERIC',
  criticalRange: [0, 1],
  warningRange: [2, 3],
  infoRange: [4, 5],
  okRange: [6, 7],
};

const aspectToCreateNotPublished = {
  description: 'this is a0 description',
  imageUrl: 'http://www.bar.com/a0.jpg',
  isPublished: false,
  name: `${tu.namePrefix}TEST_ASPECT`,
  timeout: '30s',
  valueLabel: 's',
  valueType: 'NUMERIC',
  criticalRange: [0, 1],
  warningRange: [2, 3],
  infoRange: [4, 5],
  okRange: [6, 7],
};

const subjectToCreate = {
  description: 'this is sample description',
  help: {
    email: 'sample@bar.com',
    url: 'http://www.bar.com/a0',
  },
  imageUrl: 'http://www.bar.com/a0.jpg',
  isPublished: true,
  name: `${tu.namePrefix}TEST_SUBJECT`,
};

module.exports = {
  aspectToCreate,

  doSetup() {
    return new tu.db.Sequelize.Promise((resolve, reject) => {
      const samp = { value: '1' };
      tu.db.Aspect.create(aspectToCreate)
      .then((a) => {
        samp.aspectId = a.id;
        return tu.db.Subject.create(subjectToCreate);
      })
      .then((s) => {
        samp.subjectId = s.id;
        resolve(samp);
      })
      .catch((err) => reject(err));
    });
  },

  doSetupAspectNotPublished() {
    return new tu.db.Sequelize.Promise((resolve, reject) => {
      const samp = { value: '1' };
      tu.db.Aspect.create(aspectToCreateNotPublished)
      .then((a) => {
        samp.aspectId = a.id;
        return tu.db.Subject.create(subjectToCreate);
      })
      .then((s) => {
        samp.subjectId = s.id;
        resolve(samp);
      })
      .catch((err) => reject(err));
    });
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.Sample, testStartTime)
    .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },

  subjectToCreate,

  aspectToCreateNotPublished,
};
