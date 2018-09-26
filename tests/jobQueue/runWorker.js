/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/jobQueue/runWorker.js
 */

'use strict'; // eslint-disable-line strict
const { jobQueue } = require('../../jobQueue/jobWrapper');

// wait for start message
process.on('message', (msg) => {
  if (msg.start) {
    require('../../worker/index.js');
    process.send({workerCount: countWorkers()});
  }

  function countWorkers() {
    const counts = {};
    jobQueue.workers.forEach(({type}) => {
      counts[type] = counts[type] ? ++counts[type] : 1;
    });
    return counts;
  }
});

