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
const subjectUtil = require('../subjects/utils');
const aspectUtil = require('../aspects/utils');
const testStartTime = new Date();
const aspectName = `${tu.namePrefix}TEST_ASPECT`;
const subjectName = `${tu.namePrefix}TEST_SUBJECT`;
const sampleName = subjectName + '|' + aspectName;
const samstoinit = require('../../../../cache/sampleStoreInit');

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
  name: aspectName,
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
  name: subjectName,
};

/**
 * Sets up an object with aspect id, subject id
 *
 * @param {String} aspectName The name of the aspect
 * @param {String} subjectName The name of the subject
 * @returns {Object} contains aspect id, subject id
 */
function doCustomSetup(aspectName, subjectName) {
  const aspectToCreate = {
    isPublished: true,
    name: `${tu.namePrefix + aspectName}`,
    timeout: '30s',
    criticalRange: [3, 3],
    valueType: 'NUMERIC',
  };

  const subjectToCreate = {
    isPublished: true,
    name: `${tu.namePrefix + subjectName}`,
  };

  return new tu.db.Sequelize.Promise((resolve, reject) => {
    const samp = {};
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
}

const basic = {
  value: '1',
};

module.exports = {
  aspectToCreate,
  sampleName,
  doCustomSetup,
  getBasic(overrideProps={}) {
    if (!overrideProps.name) {
      delete overrideProps.name;
    }

    const defaultProps = JSON.parse(JSON.stringify(basic));
    return Object.assign(defaultProps, overrideProps);
  },

  doSetup(props={}) {
    const { provider } = props;
    const basicAspect = JSON.parse(JSON.stringify(aspectToCreate));
    basicAspect.createdBy = provider;
    return Promise.all([
      tu.db.Aspect.create(basicAspect),
      subjectUtil.createBasic({ createdBy: provider }),
    ])
    .then(([aspect, subject]) => {
      const createdIds = {
        aspectId: aspect.id,
        subjectId: subject.id,
      };
      return createdIds;
    });
  },

  createBasic(overrideProps={}) {
    const { provider } = overrideProps;
    return this.doSetup({ provider })
    .then(({ aspectId, subjectId }) => {
      Object.assign(overrideProps, { aspectId, subjectId });
      const toCreate = this.getBasic(overrideProps);
      return tu.Sample.create(toCreate);
    });
  },

  getDependencyProps() {
    return ['aspectId', 'subjectId'];
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
    samstoinit.eradicate()
    .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => done())
    .catch(done);
  },

  populateRedis(done) {
    samstoinit.populate()
    .then(() => done())
    .catch(done);
  },

  subjectToCreate: subjectUtil.getBasic(),

  aspectToCreateNotPublished,
};
