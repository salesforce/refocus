/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/setupIntervals.js
 */
const ft = require('feature-toggles');
const jobWrapper = require('../jobQueue/jobWrapper');
const redisClient = require('../cache/redisCache').client.clock;

module.exports = function (jobs, config) {
  const startTime = Date.now();
  return getLastRunTimes(jobs)
  .then((jobTimes) => {
    const now = Date.now();
    Object.entries(jobs).forEach(([jobName, job], i) => {
      let useWorker = config.useWorker && config.useWorker[jobName];
      const toggle = config.toggles && config.toggles[jobName];
      const interval = config.intervals && config.intervals[jobName];

      useWorker = useWorker && ft.isFeatureEnabled('enableWorkerProcess');
      const jobEnabled = toggle ? ft.isFeatureEnabled(toggle) : true;

      if (interval && jobEnabled) {
        // wrap job function
        const fn = useWorker ? executeOnWorker(jobName) : job.execute;

        const initialRun = runOnceThenSetupInterval(jobName, fn, interval);

        // calculate initial interval
        const lastRunTime = jobTimes[i] || startTime;
        const timeSinceLastRun = now - lastRunTime;
        const timeUntilNextRun = interval - timeSinceLastRun;
        const initialInterval = timeUntilNextRun > 0 ? timeUntilNextRun : 0;

        setTimeout(initialRun, initialInterval);
      }
    });
  });
};

function executeOnWorker(jobName) {
  return function () {
    const data = {
      reqStartTime: Date.now(),
      clockJobName: jobName,
    };

    jobWrapper.createJob(jobName, data);
  };
}

function runOnceThenSetupInterval(jobName, fn, interval) {
  return function () {
    executeAndSetTime();
    setInterval(executeAndSetTime, interval);
  };

  function executeAndSetTime() {
    fn();
    setLastRunTime(jobName);
  }
}

function getLastRunTimes(jobs) {
  const timeKeys = Object.keys(jobs).map(getKey);
  return redisClient.mgetAsync(timeKeys);
}

function setLastRunTime(jobName) {
  const key = getKey(jobName);
  redisClient.set(key, Date.now());
}

function getKey(jobName) {
  return `CLOCK::JOB_TIMES::${jobName}`;
}

