/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/jobQueue/index.js
 */
const expect = require('chai').expect;
const { fork } = require('child_process');

describe('tests/jobQueue/index.js >', () => {
  let subprocess;
  afterEach(() => subprocess.kill());

  it('default config', () =>
    runWorker()
    .then((workerCount) => {
      expect(workerCount).to.deep.equal({
        createAuditEvents: 1,
        bulkUpsertSamples: 1,
        deleteUnusedTokens: 1,
        getHierarchy: 1,
        bulkDeleteSubjects: 1,
        checkMissedCollectorHeartbeat: 1,
        jobCleanup: 1,
        sampleTimeout: 1,
      });
    })
  );

  it('override concurrency', () => {
    const env = {
      WORKER_JOB_CONCURRENCY_createAuditEvents: 1,
      WORKER_JOB_CONCURRENCY_bulkUpsertSamples: 2,
      WORKER_JOB_CONCURRENCY_getHierarchy: 3,
      WORKER_JOB_CONCURRENCY_bulkDeleteSubjects: 4,
    };

    return runWorker(env)
    .then((workerCount) => {
      expect(workerCount).to.deep.equal({
        createAuditEvents: 1,
        bulkUpsertSamples: 2,
        deleteUnusedTokens: 1,
        getHierarchy: 3,
        bulkDeleteSubjects: 4,
        checkMissedCollectorHeartbeat: 1,
        jobCleanup: 1,
        sampleTimeout: 1,
      });
    });
  });

  it('cannot override clock job concurrency', () => {
    const env = {
      WORKER_JOB_CONCURRENCY_checkMissedCollectorHeartbeat: 1,
      WORKER_JOB_CONCURRENCY_jobCleanup: 2,
      WORKER_JOB_CONCURRENCY_sampleTimeout: 4,
    };

    return runWorker(env)
    .then((workerCount) => {
      expect(workerCount).to.deep.equal({
        createAuditEvents: 1,
        bulkUpsertSamples: 1,
        deleteUnusedTokens: 1,
        getHierarchy: 1,
        bulkDeleteSubjects: 1,
        checkMissedCollectorHeartbeat: 1,
        jobCleanup: 1,
        sampleTimeout: 1,
      });
    });
  });

  const forkPath = require.resolve('./runWorker');
  function runWorker(env) {
    subprocess = fork(forkPath, [], { env });
    const waitForStartup = new Promise((resolve) => {
      subprocess.on('message', (msg) => {
        if (msg.workerCount) {
          resolve(msg.workerCount);
        }
      });
    });
    subprocess.send({ start: true });
    return waitForStartup;
  }
});

