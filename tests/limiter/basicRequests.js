/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/limiter/basicRequests.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../index').app);

process.send({msg: 'ready'});
process.on('message', (msg) => {
  api[msg.method](msg.path)
  .set('Authorization', msg.token)
  .send(msg.data)
  .end((err, res) => {
    if (err) {
      process.exit(1);
    } else {
      process.send(res);
    }
  });
});
