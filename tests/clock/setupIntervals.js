/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/setupIntervals.js
 */
const expect = require('chai').expect;
const ms = require('ms');
const mockRequire = require('mock-require');
const sinon = require('sinon');
const u = require('./utils/utils');
const redisClient = require('../../cache/redisCache').client.clock;
const jobSetup = require('../../jobQueue/setup');

describe('tests/clock/setupIntervals.js >', () => {
  beforeEach(() => redisClient.flushallAsync());
  after(() => redisClient.flushallAsync());
  afterEach(u.stopClockProcess);

  describe('timing >', function () {
    this.timeout(5000);
    beforeEach(u.trackExecutionTimes);
    afterEach(u.clearTracking);

    const intervals = {
      job1: ms('5m'),
      job2: ms('3m'),
    };

    it('basic', () =>
      u.runSetupIntervals(intervals)
      .then(() => u.waitUntil('20m'))
      .then(() => {
        u.expectCalledAt('job1', ['5m', '10m', '15m', '20m']);
        u.expectCalledAt('job2', ['3m', '6m', '9m', '12m', '15m', '18m']);
      })
    );

    it('intervals remain consistent when process is restarted', () =>
      u.runSetupIntervals(intervals)
      .then(() => u.waitUntil('13m'))
      .then(() => u.restartClockProcess(intervals))
      .then(() => u.waitUntil('20m'))
      .then(() => {
        u.expectCalledAt('job1', ['5m', '10m', '15m', '20m']);
        u.expectCalledAt('job2', ['3m', '6m', '9m', '12m', '15m', '18m']);
      })
    );

    it('misses an interval while down, runs right away', () =>
      u.runSetupIntervals(intervals)
      .then(() => u.waitUntil('10m'))
      .then(() => u.stopClockProcess())
      .then(() => u.waitUntil('17m'))
      .then(() => u.runSetupIntervals(intervals))
      .then(() => u.waitUntil('24m'))
      .then(() => {
        u.expectCalledAt('job1', ['5m', '10m', '17m', '22m']);
        u.expectCalledAt('job2', ['3m', '6m', '9m', '17m', '20m', '23m']);
      })
    );

    it('multiple restarts, still follows schedule', () =>
      u.runSetupIntervals(intervals)
      .then(() => u.waitUntil('11m'))
      .then(() => u.restartClockProcess(intervals))
      .then(() => u.waitUntil('12m'))
      .then(() => u.restartClockProcess(intervals))
      .then(() => u.waitUntil('13m'))
      .then(() => u.restartClockProcess(intervals))
      .then(() => u.waitUntil('14m'))
      .then(() => u.restartClockProcess(intervals))
      .then(() => u.waitUntil('20m'))
      .then(() => {
        u.expectCalledAt('job1', ['5m', '10m', '15m', '20m']);
        u.expectCalledAt('job2', ['3m', '6m', '9m', '12m', '15m', '18m']);
      })
    );

    it('new interval takes effect when restarted (scheduled run)', () =>
      u.runSetupIntervals({ job1: ms('3m') })
      .then(() => u.waitUntil('10m'))
      .then(() => u.restartClockProcess({ job1: ms('5m') }))
      .then(() => u.waitUntil('20m'))
      .then(() => {
        u.expectCalledAt('job1', ['3m', '6m', '9m', '14m', '19m']);
      })
    );

    it('new interval takes effect when restarted (immediate run)', () =>
      u.runSetupIntervals({ job1: ms('5m') })
      .then(() => u.waitUntil('13m'))
      .then(() => u.restartClockProcess({ job1: ms('2m') }))
      .then(() => u.waitUntil('20m'))
      .then(() => {
        u.expectCalledAt('job1', ['5m', '10m', '13m', '15m', '17m', '19m']);
      })
    );
  });

  describe('useWorker >', () => {
    beforeEach(u.trackExecutionCount);
    afterEach(u.clearTracking);

    const jobs = {
      job1: { execute: () => Date.now(), },
      job2: { execute: () => Date.now(), },
    };

    const config = {
      intervals: {
        job1: 50,
        job2: 30,
      },
      useWorker: {
        job1: true,
        job2: true,
      },
    };

    mockRequire('../../clock/scheduledJobs/job1', jobs.job1);
    mockRequire('../../clock/scheduledJobs/job2', jobs.job2);
    const workerSpy1 = sinon.spy(jobs.job1, 'execute');
    const workerSpy2 = sinon.spy(jobs.job2, 'execute');
    let env;

    let jobProcessor;
    before(() => jobSetup.resetJobQueue());
    after(() => jobSetup.resetJobQueue());
    before(() => {
      jobProcessor = require('../../worker/jobProcessor');
    });

    before(() => jobProcessor.processClockJobs(jobs, config));
    beforeEach(() => env = { ENABLE_WORKER_PROCESS: true });
    afterEach((() => workerSpy1.resetHistory()));
    afterEach((() => workerSpy2.resetHistory()));

    it('no worker jobs', () => {
      config.useWorker.job1 = false;
      config.useWorker.job2 = false;

      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        expect(workerSpy1.called).to.be.false;
        expect(workerSpy2.called).to.be.false;
        u.expectCalled('job1', true);
        u.expectCalled('job2', true);
      });
    });

    it('worker disabled, executed locally', () => {
      config.useWorker.job1 = true;
      config.useWorker.job2 = true;

      env.ENABLE_WORKER_PROCESS = false;
      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        expect(workerSpy1.called).to.be.false;
        expect(workerSpy2.called).to.be.false;
        u.expectCalled('job1', true);
        u.expectCalled('job2', true);
      });
    });

    it('job1 runs on worker', () => {
      config.useWorker.job1 = true;
      config.useWorker.job2 = false;

      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        expect(workerSpy1.called).to.be.true;
        expect(workerSpy2.called).to.be.false;
        u.expectCalled('job1', false);
        u.expectCalled('job2', true);
      });
    });

    it('job2 runs on worker', () => {
      config.useWorker.job1 = false;
      config.useWorker.job2 = true;

      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        expect(workerSpy1.called).to.be.false;
        expect(workerSpy2.called).to.be.true;
        u.expectCalled('job1', true);
        u.expectCalled('job2', false);
      });
    });

    it('both jobs run on worker', () => {
      config.useWorker.job1 = true;
      config.useWorker.job2 = true;

      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        expect(workerSpy1.called).to.be.true;
        expect(workerSpy2.called).to.be.true;
        u.expectCalled('job1', false);
        u.expectCalled('job2', false);
      });
    });

  });

  describe('toggles >', () => {
    beforeEach(u.trackExecutionCount);
    afterEach(u.clearTracking);
    afterEach(u.stopClockProcess);

    const config = {
      intervals: {
        job1: 50,
        job2: 30,
      },
      toggles: {},
    };

    const env = {};

    it('no toggles', () => {
      config.toggles.job1 = undefined;
      config.toggles.job2 = undefined;

      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        u.expectCalled('job1', true);
        u.expectCalled('job2', true);
      });
    });

    it('job1 behind toggle, toggle off', () => {
      config.toggles.job1 = 'job1Toggle';
      config.toggles.job2 = undefined;

      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        u.expectCalled('job1', false);
        u.expectCalled('job2', true);
      });
    });

    it('job1 behind toggle, toggle on', () => {
      config.toggles.job1 = 'job1Toggle';
      config.toggles.job2 = undefined;

      env.job1Toggle = true;
      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        u.expectCalled('job1', true);
        u.expectCalled('job2', true);
      });
    });

    it('job1 behind toggle, job2Toggle has no effect', () => {
      config.toggles.job1 = 'job1Toggle';
      config.toggles.job2 = undefined;
      env.job1Toggle = true;
      env.job2Toggle = false;

      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        u.expectCalled('job1', true);
        u.expectCalled('job2', true);
      });
    });

    it('both behind toggle', () => {
      config.toggles.job1 = 'job1Toggle';
      config.toggles.job2 = 'job2Toggle';
      env.job1Toggle = false;
      env.job2Toggle = true;

      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        u.expectCalled('job1', false);
        u.expectCalled('job2', true);
      });
    });

    it('both behind toggle, both on', () => {
      config.toggles.job1 = 'job1Toggle';
      config.toggles.job2 = 'job2Toggle';
      env.job1Toggle = true;
      env.job2Toggle = true;

      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        u.expectCalled('job1', true);
        u.expectCalled('job2', true);
      });
    });

    it('both behind toggle, both off', () => {
      config.toggles.job1 = 'job1Toggle';
      config.toggles.job2 = 'job2Toggle';
      env.job1Toggle = false;
      env.job2Toggle = false;

      return u.runSetupIntervals(config.intervals, config.useWorker, config.toggles, env)
      .delay(100)
      .then(() => {
        u.expectCalled('job1', false);
        u.expectCalled('job2', false);
      });
    });
  });
});
