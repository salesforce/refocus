/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/limiter/limiter.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../index').app);
const constants = require('../../api/v1/constants');
const tu = require('../testUtils');
const u = require('./utils');
const path = '/v1/aspects';
const expect = require('chai').expect;
const fork = require('child_process').fork;
const Promise = require('bluebird');
const rateLimit = Promise.promisify(require('../../rateLimit'));
const conf = require('../../config');
conf.expressLimiterPath = ['*'];
conf.expressLimiterMethod = ['all'];
conf.expressLimiterLookup = ['headers.UserName','headers.content-type'];
conf.expressLimiterTotal = '3';
conf.expressLimiterExpire = '2000';
conf.expressLimiterTotal2 = '1';
conf.expressLimiterExpire2 = '100';

describe('tests/limiter/limiter.js >', () => {
  let token1;
  let token2;
  let predefinedAdminUserToken;
  let opts;
  let subprocess;
  let i = 0;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token1 = returnedToken;
      return tu.createSecondUser();
    })
    .then((u2) => tu.createTokenFromUserName(u2.name))
    .then((tok2) => {
      token2 = tok2;
    })
    .then(() => predefinedAdminUserToken = tu.createAdminToken())
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  function doFork(file, env) {
    env.PORT = conf.port + 1;
    opts = { silent: true, env, };
    subprocess = fork(`tests/limiter/${file}.js`, [], opts);
    return new Promise((resolve) => subprocess.on('message', resolve));
  }

  function expectLimited(res) {
    const headers = res.headers || res.header;
    expect(headers['x-ratelimit-limit']).to.exist;
    expect(headers['x-ratelimit-remaining']).to.exist;
  }

  function expectNotLimited(res) {
    const headers = res.headers || res.header;
    expect(headers['x-ratelimit-limit']).to.not.exist;
    expect(headers['x-ratelimit-remaining']).to.not.exist;
  }

  describe('limit functionality >', () => {
    afterEach((done) => setTimeout(done, 100));

    function makeRequest(path, method, token = token1, data) {
      if (!data && path === '/v1/aspects' && method === 'post') {
        data = {name: `${tu.namePrefix}Limiter${i}`, timeout: '1m'};
        i++;
      }

      return new Promise((resolve, reject) => {
        api[method](path)
        .set('Authorization', token)
        .send(data)
        .end((err, res) => {
          if (err) {
            reject(err)
          } else {
            resolve(res);
          }
        });
      });
    }

    it('Admin user req#1, no ratelimit headers, ok', (done) => {
      makeRequest('/v1/aspects', 'post', predefinedAdminUserToken)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.CREATED);
        expect(res.header).to.not.have.property('x-ratelimit-limit');
        done();
      })
      .catch(done);
    });

    it('Admin user req#2, no ratelimit headers, ok', (done) => {
      makeRequest('/v1/aspects', 'post', predefinedAdminUserToken)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.CREATED);
        expect(res.header).to.not.have.property('x-ratelimit-limit');
        done();
      })
      .catch(done);
    });

    it('Admin user req#3, no ratelimit headers, ok', (done) => {
      makeRequest('/v1/aspects', 'post', predefinedAdminUserToken)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.CREATED);
        expect(res.header).to.not.have.property('x-ratelimit-limit');
        done();
      })
      .catch(done);
    });

    it('Admin user req#4, no ratelimit headers, ok', (done) => {
      makeRequest('/v1/aspects', 'post', predefinedAdminUserToken)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.CREATED);
        expect(res.header).to.not.have.property('x-ratelimit-limit');
        done();
      })
      .catch(done);
    });

    it('OK, under limit', (done) => {
      makeRequest('/v1/aspects', 'post', token1)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.CREATED);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('2');
        done();
      })
      .catch(done);
    });

    it('OK, still under limit', (done) => {
      makeRequest('/v1/aspects', 'post', token1)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.CREATED);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('1');
        done();
      })
      .catch(done);
    });

    it('OK, different user', (done) => {
      makeRequest('/v1/aspects', 'post', token2)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.CREATED);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('2');
        done();
      })
      .catch(done);
    });

    it('First user, 201', (done) => {
      makeRequest('/v1/aspects', 'post', token1)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.CREATED);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('0');
        done();
      })
      .catch(done);
    });

    it('First user, 429', (done) => {
      makeRequest('/v1/aspects', 'post', token1)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.TOO_MANY_REQUESTS);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('0');
        done();
      })
      .catch(done);
    });

    it('Test limiting on multiple headers. Should fail with 400, would have' +
      ' failed with 429 if we werent limiting on content-type', (done) => {
      makeRequest('/v1/aspects', 'post', token1, '{}')
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.BAD_REQUEST);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('2');
        done();
      })
      .catch(done);
    });

    it('First user, different content-type. 400', (done) => {
      makeRequest('/v1/aspects', 'post', token1, '{}')
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.BAD_REQUEST);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('1');
        done();
      })
      .catch(done);
    });

    it('First user, different content-type. 400', (done) => {
      makeRequest('/v1/aspects', 'post', token1, '{}')
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.BAD_REQUEST);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('0');
        done();
      })
      .catch(done);
    });

    it('First user, different content-type. 429', (done) => {
      makeRequest('/v1/aspects', 'post', token1, '{}')
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.TOO_MANY_REQUESTS);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('0');
        done();
      })
      .catch(done);
    });

    it('Second user, back-to-back requests, 429', (done) => {
      makeRequest('/v1/aspects', 'post', token2)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.CREATED);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('1'); //TODO: should be failing
      })
      .then(() => makeRequest('/v1/aspects', 'post', token2))
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.TOO_MANY_REQUESTS);
        expect(res.header['x-ratelimit-limit']).to.equal('1');
        expect(res.header['x-ratelimit-remaining']).to.equal('0');
        done();
      })
      .catch(done);
    });

    it('Second user still has one more request after waiting', (done) => {
      makeRequest('/v1/aspects', 'post', token2)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.CREATED);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('0');
        done();
      })
      .catch(done);
    });

    it('Second user, 429', (done) => {
      makeRequest('/v1/aspects', 'post', token2)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.TOO_MANY_REQUESTS);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('0');
        done();
      })
      .catch(done);
    });

    it('first user still blocked', (done) => {
      makeRequest('/v1/aspects', 'post', token1)
      .then((res) => {
        expect(res.status).to.equal(constants.httpStatus.TOO_MANY_REQUESTS);
        expect(res.header['x-ratelimit-limit']).to.equal('3');
        expect(res.header['x-ratelimit-remaining']).to.equal('0');
        done();
      })
      .catch(done);
    });

    it('wait 2s, ok again', function (done) {
      this.timeout(3000);
      setTimeout(() => {
        makeRequest('/v1/aspects', 'post', token1)
        .then((res) => {
          expect(res.status).to.equal(constants.httpStatus.CREATED);
          expect(res.header['x-ratelimit-limit']).to.equal('3');
          expect(res.header['x-ratelimit-remaining']).to.equal('2');
          done();
        })
        .catch(done);
      }, 2000);
    });
  });

  describe('environment variable parsing >', () => {
    afterEach(() => subprocess && subprocess.kill());

    it('basic', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '*',
        EXPRESS_LIMITER_METHOD: 'all',
        EXPRESS_LIMITER_LOOKUP: 'headers.UserName',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('envToConf', env)
      .then((conf) => {
        expect(conf.expressLimiterPath).to.deep.equal(['*']);
        expect(conf.expressLimiterMethod).to.deep.equal(['all']);
        expect(conf.expressLimiterLookup).to.deep.equal(['headers.UserName']);
        expect(conf.expressLimiterTotal).to.deep.equal('4');
        expect(conf.expressLimiterExpire).to.deep.equal('3000');
      })
      .then(done)
      .catch(done);
    });

    it('multiple', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '/v1/aspects,/v1/subjects',
        EXPRESS_LIMITER_METHOD: 'GET,PUT',
        EXPRESS_LIMITER_LOOKUP: 'headers.UserName,headers.ip',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('envToConf', env)
      .then((conf) => {
        expect(conf.expressLimiterPath)
        .to.deep.equal(['/v1/aspects', '/v1/subjects']);
        expect(conf.expressLimiterMethod).to.deep.equal(['GET', 'PUT']);
        expect(conf.expressLimiterLookup)
        .to.deep.equal(['headers.UserName', 'headers.ip']);
        expect(conf.expressLimiterTotal).to.deep.equal('4');
        expect(conf.expressLimiterExpire).to.deep.equal('3000');
      })
      .then(done)
      .catch(done);
    });

    it('empty', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '',
        EXPRESS_LIMITER_METHOD: '',
        EXPRESS_LIMITER_LOOKUP: '',
        EXPRESS_LIMITER_TOTAL: '',
        EXPRESS_LIMITER_EXPIRE: '',
      };
      doFork('envToConf', env)
      .then((conf) => {
        expect(conf.expressLimiterPath).to.deep.equal([]);
        expect(conf.expressLimiterMethod).to.deep.equal([]);
        expect(conf.expressLimiterLookup).to.deep.equal(['headers.UserName']);
        expect(conf.expressLimiterTotal).to.deep.equal('');
        expect(conf.expressLimiterExpire).to.deep.equal('');
      })
      .then(done)
      .catch(done);
    });

    it('missing', (done) => {
      const env = {};
      doFork('envToConf', env)
      .then((conf) => {
        expect(conf.expressLimiterPath).to.deep.equal([]);
        expect(conf.expressLimiterMethod).to.deep.equal([]);
        expect(conf.expressLimiterLookup).to.deep.equal(['headers.UserName']);
        expect(conf.expressLimiterTotal).to.not.exist;
        expect(conf.expressLimiterExpire).to.not.exist;
      })
      .then(done)
      .catch(done);
    });
  });

  describe('lookup/total/expire - test middleware directly >', () => {
    let req;
    let res;

    beforeEach(() => {
      conf.expressLimiterPath = '/v1/aspects';
      conf.expressLimiterMethod = 'POST';
      conf.expressLimiterLookup = ['headers.UserName'];
      conf.expressLimiterTotal = '4';
      conf.expressLimiterExpire = '3000';
      conf.expressLimiterTotal2 = undefined;
      conf.expressLimiterExpire2 = undefined;
      req = {headers: {}};
      req.headers.UserName = tu.userName;
      res = {headers: {}};
      res.set = function (name, value) { this.headers[name.toLowerCase()] = value };
    });

    it('ok', (done) => {
      rateLimit(req, res)
      .then(() => expectLimited(res))
      .then(done)
      .catch(done);
    });

    it('missing lookup', (done) => {
      conf.expressLimiterLookup = [];
      rateLimit(req, res)
      .then(() => expectNotLimited(res))
      .then(done)
      .catch(done);
    });

    it('empty lookup', (done) => {
      conf.expressLimiterLookup = [''];
      rateLimit(req, res)
      .then(() => expectNotLimited(res))
      .then(done)
      .catch(done);
    });

    it('invalid lookup (undefined)', (done) => {
      conf.expressLimiterLookup = ['headers.aaa'];
      rateLimit(req, res)
      .then(() => expectNotLimited(res))
      .then(done)
      .catch(done);
    });

    it('invalid lookup (error)', (done) => {
      conf.expressLimiterLookup = ['headers.aaa.bbb'];
      rateLimit(req, res)
      .then(() => expectNotLimited(res))
      .then(done)
      .catch(done);
    });

    it('invalid lookup (error, multiple)', (done) => {
      conf.expressLimiterLookup = ['headers.aaa.bbb', 'headers.UserName'];
      rateLimit(req, res)
      .then(() => expectLimited(res))
      .then(done)
      .catch(done);
    });

    it('lookup field undefined', (done) => {
      conf.expressLimiterLookup = ['headers.UserName'];
      req.headers.UserName = undefined;
      rateLimit(req, res)
      .then(() => expectNotLimited(res))
      .then(done)
      .catch(done);
    });

    it('missing total', (done) => {
      conf.expressLimiterTotal = undefined;
      rateLimit(req, res)
      .then(() => expectNotLimited(res))
      .then(done)
      .catch(done);
    });

    it('missing expire', (done) => {
      conf.expressLimiterExpire = undefined;
      rateLimit(req, res)
      .then(() => expectNotLimited(res))
      .then(done)
      .catch(done);
    });

    it('empty total', (done) => {
      conf.expressLimiterTotal = '';
      rateLimit(req, res)
      .then(() => expectNotLimited(res))
      .then(done)
      .catch(done);
    });

    it('empty expire', (done) => {
      conf.expressLimiterExpire = '';
      rateLimit(req, res)
      .then(() => expectNotLimited(res))
      .then(done)
      .catch(done);
    });
  });

  describe.skip('path/method - fork subprocess >', function() {
    this.timeout(10000);
    afterEach(() => subprocess && subprocess.kill());

    function doSend(path, method, token = token1, data) {
      if (!data && path === '/v1/aspects' && method === 'post') {
        data = {name: `${tu.namePrefix}Limiter${i}`, timeout: '1m'};
        i++;
      }

      subprocess.send({path, method, token, data});
      return new Promise((resolve) => subprocess.on('message', resolve));
    }

    it('limit all requests', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '*',
        EXPRESS_LIMITER_METHOD: 'all',
        EXPRESS_LIMITER_LOOKUP: 'headers.UserName',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('basicRequests', env)
      .then(() => doSend('/v1/aspects', 'post')).then(expectLimited)
      .then(() => doSend('/v1/aspects', 'get')).then(expectLimited)
      .then(() => doSend('/v1/subjects', 'post')).then(expectLimited)
      .then(() => doSend('/v1/subjects', 'get')).then(expectLimited)
      .then(done)
      .catch(done);
    });

    it('limit on POST only', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '*',
        EXPRESS_LIMITER_METHOD: 'post',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('basicRequests', env)
      .then(() => doSend('/v1/aspects', 'post')).then(expectLimited)
      .then(() => doSend('/v1/aspects', 'get')).then(expectNotLimited)
      .then(() => doSend('/v1/subjects', 'post')).then(expectLimited)
      .then(() => doSend('/v1/subjects', 'get')).then(expectNotLimited)
      .then(done)
      .catch(done);
    });

    it('limit on multiple methods', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '*',
        EXPRESS_LIMITER_METHOD: 'get,post',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('basicRequests', env)
      .then(() => doSend('/v1/aspects', 'post')).then(expectLimited)
      .then(() => doSend('/v1/aspects', 'get')).then(expectLimited)
      .then(() => doSend('/v1/aspects', 'put')).then(expectNotLimited)
      .then(done)
      .catch(done);
    });

    it('limit on aspects only', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '/v1/aspects',
        EXPRESS_LIMITER_METHOD: 'all',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('basicRequests', env)
      .then(() => doSend('/v1/aspects', 'post')).then(expectLimited)
      .then(() => doSend('/v1/aspects', 'get')).then(expectLimited)
      .then(() => doSend('/v1/subjects', 'post')).then(expectNotLimited)
      .then(() => doSend('/v1/subjects', 'get')).then(expectNotLimited)
      .then(done)
      .catch(done);
    });

    it('limit on multiple paths', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '/v1/samples,/v1/subjects',
        EXPRESS_LIMITER_METHOD: 'all',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('basicRequests', env)
      .then(() => doSend('/v1/aspects', 'get')).then(expectNotLimited)
      .then(() => doSend('/v1/subjects', 'get')).then(expectLimited)
      .then(() => doSend('/v1/samples', 'get')).then(expectLimited)
      .then(done)
      .catch(done);
    });

    it('limit on path regex', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '/v1/\*ects',
        EXPRESS_LIMITER_METHOD: 'all',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('basicRequests', env)
      .then(() => doSend('/v1/aspects', 'get')).then(expectLimited)
      .then(() => doSend('/v1/subjects', 'get')).then(expectLimited)
      .then(() => doSend('/v1/samples', 'get')).then(expectNotLimited)
      .then(done)
      .catch(done);
    });

    it('method case sensitivity', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '*',
        EXPRESS_LIMITER_METHOD: 'POST',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('basicRequests', env)
      .then(() => doSend('/v1/aspects', 'post'))
      .then(expectLimited)
      .then(done)
      .catch(done);
    });

    it('missing path - limiter not initialized', (done) => {
      const env = {
        EXPRESS_LIMITER_METHOD: 'POST',
        EXPRESS_LIMITER_LOOKUP: 'headers.UserName',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('basicRequests', env)
      .then(() => doSend('/v1/aspects', 'post'))
      .then(expectNotLimited)
      .then(done)
      .catch(done);
    });

    it('missing method - limiter not initialized', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '/v1/aspects',
        EXPRESS_LIMITER_LOOKUP: 'headers.UserName',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('basicRequests', env)
      .then(() => doSend('/v1/aspects', 'post'))
      .then(expectNotLimited)
      .then(done)
      .catch(done);
    });

    it('invalid path - limiter not initialized', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '/v1/s(ub[je[cts',
        EXPRESS_LIMITER_METHOD: 'POST',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('basicRequests', env)
      .then(() => doSend('/v1/aspects', 'post'))
      .then(expectNotLimited)
      .then(done)
      .catch(done);
    });

    it('invalid method - limiter not initialized', (done) => {
      const env = {
        EXPRESS_LIMITER_PATH: '*',
        EXPRESS_LIMITER_METHOD: 'aaa',
        EXPRESS_LIMITER_TOTAL: '4',
        EXPRESS_LIMITER_EXPIRE: '3000',
      };
      doFork('basicRequests', env)
      .then(() => doSend('/v1/aspects', 'post'))
      .then(expectNotLimited)
      .then(done)
      .catch(done);
    });
  });
});
