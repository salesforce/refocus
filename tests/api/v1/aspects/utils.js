/**
 * tests/api/v1/aspects/utils.js
 */
'use strict';

const tu = require('../../../testUtils');

const testStartTime = new Date();

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
  toCreate: {
    name: `${tu.namePrefix}ASPECTNAME`,
    isPublished: true,
    timeout: '110s',
    status0range: [0, 0],
    status1range: [1, 2],
    valueType: 'NUMERIC',
  },

  subjectToCreate,

  forceDelete(done) {
    tu.forceDelete(tu.db.Aspect, testStartTime)
    .then(() => tu.forceDelete(tu.db.Tag, testStartTime))
    .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    .then(() => tu.forceDelete(tu.db.Sample, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },
};
