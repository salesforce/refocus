/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/utils.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../../../testUtils');
const aspectName = `${tu.namePrefix}TEST_ASPECT`;
const subjectName = `${tu.namePrefix}TEST_SUBJECT`;

const aspectToCreate = {
  description: 'this is a0 description',
  imageUrl: 'http://www.bar.com/a0.jpg',
  isPublished: true,
  name: aspectName,
  timeout: '30s',
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
  name: subjectName,
};

const aspectToCreateNotPublished = {
  description: 'this is a0 description',
  imageUrl: 'http://www.bar.com/a0.jpg',
  isPublished: false,
  name: aspectName,
  timeout: '30s',
  valueLabel: 's',
  valueType: 'NUMERIC',
  criticalRange: [0, 1],
  warningRange: [2, 3],
  infoRange: [4, 5],
  okRange: [6, 7],
};

module.exports = {
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

  aspectToCreate,
  subjectToCreate,
};
