/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/collector/interceptRequests.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const sinon = require('sinon');
const interceptor = require('express-interceptor');
const Promise = require('bluebird');
const supertest = require('supertest');
const ms = require('ms');
const app = require('../../../index').app;
const tu = require('../../testUtils');
const forkUtils = require('./forkUtils');
const constants = require('../../../api/v1/constants');
const genPath = '/v1/generators';
const api = supertest(app);
supertest.Test.prototype.end = Promise.promisify(supertest.Test.prototype.end);
supertest.Test.prototype.then = function (resolve, reject) {
  return this.end().then(resolve).catch(reject);
};

let token;

module.exports = {
  setupInterception,
  doStart,
  postGenerator,
  patchGenerator,
  putGenerator,
  postStatus,
  getStatus,
  getCollector,
  setToken,
  expectHeartbeatGens,
  expectHeartbeatStatus,
  expectSubjectQuery,
  expectBulkUpsertSamples,
};

function setupInterception(interceptConfig) {
  setupMiddleware(interceptConfig);
  setupInterceptFuncs(interceptConfig);
}

function setupMiddleware(interceptConfig) {
  app.use(interceptor(function (req, res) {
    const regexes = Object.values(interceptConfig).map(v => v.path);
    return {
      isInterceptable: () => regexes.some((re) => req.path.match(re)),
      intercept: (body, send) => {
        res.body = JSON.parse(body);
        send(body);
      },
    };
  }));
}

function setupInterceptFuncs(interceptConfig) {
  Object.entries(interceptConfig).forEach(([reqType, conf]) => {
    conf.reqType = reqType;
    conf.promiseMap = { '': [] };
    conf.timeoutMap = { '': [] };

    interceptRequest(conf);
    const awaitFunc = awaitRequest.bind(null, conf);
    if (conf.expectedInterval) {
      const tickAndAwait = forkUtils.tickUntilComplete.bind(null, awaitFunc);
      module.exports[`await${reqType}`] = tickAndAwait;
    } else {
      module.exports[`await${reqType}`] = awaitFunc;
    }
  });

  function interceptRequest(conf) {
    const { controller, method } = conf;
    if (controller[method].restore) controller[method].restore();
    const originalMethod = controller[method];

    sinon.stub(controller, method)
    .callsFake(callThenResolve.bind(null, originalMethod, conf));
  }

  function awaitRequest(conf, collectorName='') {
    const timeout = conf.expectedInterval && conf.expectedInterval() * 1.5;
    const msg = `${conf.reqType} ${collectorName} (${timeout})`;

    let timeoutPromise;
    if (timeout) {
      timeoutPromise = new Promise((resolve) => {
        conf.timeoutMap[collectorName];
        const resolveArray = conf.timeoutMap[collectorName];
        if (!resolveArray) conf.timeoutMap[collectorName] = [resolve];
        else resolveArray.push(resolve);
      })
      .timeout(timeout, msg)
      .catch(Promise.TimeoutError, (err) => {
        conf.promiseMap[collectorName].shift();
        conf.timeoutMap[collectorName].shift();
        return Promise.reject(err);
      });
    } else {
      timeoutPromise = Promise.resolve();
    }

    const awaitPromise = new Promise((resolve) => {
      const startTime = Date.now();
      const resolveArray = conf.promiseMap[collectorName];
      if (!resolveArray) conf.promiseMap[collectorName] = [{ resolve, startTime }];
      else resolveArray.push({ resolve, startTime });
    })
    .tap(({ req, res }) => {
      // console.log(`${conf.reqType} request ${collectorName}:`, req.url, req.body);
      // console.log(`${conf.reqType} response ${collectorName}:`, res.body);
      if (conf.expectedRequestKeys) {
        expect(req.body).to.include.keys(conf.expectedRequestKeys);
      }

      if (conf.expectedResponseKeys) {
        expect(res.body).to.include.keys(conf.expectedResponseKeys);
      }
    });

    return timeoutPromise.then(() => awaitPromise);
  };

  function callThenResolve(originalMethod, conf, req, res, next) {
    let collectorName;
    if (conf.collectorNamePath) {
      collectorName =
        conf.collectorNamePath
        .split('.')
        .slice(1)
        .reduce((curr, next) => curr[next], req);
    }

    let timeoutArray = conf.timeoutMap[collectorName];
    if (!timeoutArray || !timeoutArray.length) {
      timeoutArray = conf.timeoutMap[''];
    }

    let promiseArray = conf.promiseMap[collectorName];
    if (!promiseArray || !promiseArray.length) {
      promiseArray = conf.promiseMap[''];
    }

    const reqObj = req;
    req = {
      body: JSON.parse(JSON.stringify(reqObj.body)),
      url: reqObj.url,
    };

    Promise.resolve()

    // cancel timeouts
    .then(() => {
      timeoutArray.forEach((resolveTimeout) => {
        resolveTimeout && resolveTimeout();
      });
      timeoutArray.splice(0);
    })

    // run the original method
    .then(() => originalMethod(reqObj, res, next))

    // resolve await promises
    .then(() => {
      promiseArray.forEach((promise) => {
        const waitTime = promise ? Date.now() - promise.startTime : null;
        promise && promise.resolve({ req, res, waitTime });
      });
      promiseArray.splice(0);
    });
  }
}

function doStart(name) {
  const awaitStart = this.awaitStart(name);
  return forkUtils.doStart(name)
  .then(() => awaitStart);
}

function postGenerator(gen) {
  return api.post(genPath)
  .set('Authorization', token)
  .send(gen)
  .expect(constants.httpStatus.CREATED);
}

function patchGenerator(key, body) {
  return api.patch(`${genPath}/${key}`)
  .set('Authorization', token)
  .send(body)
  .expect(constants.httpStatus.OK);
}

function putGenerator(gen) {
  return api.put(`${genPath}/${gen.name}`)
  .set('Authorization', token)
  .send(gen)
  .expect(constants.httpStatus.OK);
}

function postStatus(status, key) {
  return api.post(`${'/v1/collectors'}/${key}/${status}`)
  .set('Authorization', token)
  .send({})
  .expect(constants.httpStatus.OK);
}

function getStatus(key) {
  return api.get(`${'/v1/collectors'}/${key}/status`)
  .set('Authorization', token)
  .expect(constants.httpStatus.OK);
}

function getCollector(key) {
  return api.get(`${'/v1/collectors'}/${key}`)
  .set('Authorization', token)
  .expect(constants.httpStatus.OK);
}

function setToken(_token) {
  token = _token;
}

function expectHeartbeatGens(collectorName, { added, updated, deleted }) {
  return this.awaitHeartbeat(collectorName)
  .then(({ res }) => {
    const actualExpected = [
      [res.body.generatorsAdded, added],
      [res.body.generatorsUpdated, updated],
      [res.body.generatorsDeleted, deleted],
    ];
    actualExpected.forEach(([actual, expected]) => {
      if (expected) {
        expected = expected.map(g => g.name);
        actual = actual.map(g => g.name);
        expect(actual).to.deep.equal(expected);
      }
    });
  });
}

function expectHeartbeatStatus(collectorName, expectedStatus) {
  return this.awaitHeartbeat(collectorName)
  .then(({ res }) => {
    expect(res.body.collectorConfig.status).to.equal(expectedStatus);
  });
}

function expectSubjectQuery(collectorName, expectedSubjectQuery) {
  return this.awaitSubjectQuery(collectorName)
  .then(({ req }) => {
    expect(req.url).to.equal(expectedSubjectQuery);
  });
}

function expectBulkUpsertSamples(collectorName, interval, ...expectedUpserts) {
  return Promise.map(
    expectedUpserts,
    expectBulkUpsertInterval.bind(this, collectorName, interval),
  );
}

function expectBulkUpsertInterval(collectorName, expectedInterval, expectedSamples) {
  const awaitBulkUpsert = this.awaitBulkUpsert;
  expectedInterval = ms(expectedInterval);

  expectedSamples = expectedSamples.map((s) =>
    typeof s === 'string' ? { name: s } : s
  );
  expectedSamples.sort(sortByName);

  let firstMatchTime;
  return awaitMatch()
  .then(() => firstMatchTime = Date.now())
  .then(() => awaitMatch())
  .then(() => {
    const observedInterval = Date.now() - firstMatchTime;
    expect(observedInterval).to.equal(expectedInterval);
  });

  function awaitMatch(startTime=Date.now(), upsertsSeen=[]) {
    return awaitBulkUpsert(collectorName)
    .then(({ req }) => {
      const samples = req.body.sort(sortByName);
      upsertsSeen.push(samples);
      const matches = samples.every((sample, i) =>
        sample.name === expectedSamples[i].name
      );
      const intervalExceeded = Date.now() - startTime > expectedInterval * 2;
      if (matches) {
        samples.forEach((sample, i) => {
          const expectedSample = expectedSamples[i];
          expect(sample.name).to.equal(expectedSample.name);
          if (expectedSample.value) {
            expect(sample.value).to.equal(expectedSample.value);
          }
        });
      } else if (intervalExceeded) {
        throw Error(
          `no match found for [${expectedSamples.map(s => s.name)}]. ` +
          `seen so far: [${upsertsSeen.map((upsert) => `[${upsert.map(s => s.name)}]`)}]`
        );
      } else {
        return awaitMatch(startTime, upsertsSeen);
      }
    });
  }

  function sortByName(s1, s2) {
    if (s1.name < s2.name) {
      return -1;
    } else if (s1.name > s2.name) {
      return 1;
    } else {
      return 0;
    }
  }
}
