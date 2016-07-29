/**
 * tests/db/model/subject/utils.js
 */
'use strict';

const tu = require('../../../testUtils');

const testStartTime = new Date();

const subjectPrototype = {
  description: 'description description description description     ',
  helpEmail: 'foo@bar.com',
  helpUrl: 'http://www.bar.com',
  imageUrl: 'http://www.bar.com/foo.jpg',
  isPublished: true,
};

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.Subject, testStartTime)
    .then(() => tu.forceDelete(tu.db.Tag, testStartTime))
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },

  getSubjectPrototype(name, parentId) {
    const s = JSON.parse(JSON.stringify(subjectPrototype));
    s.name = name;
    s.parentId = parentId;
    return s;
  },
};
