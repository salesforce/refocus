/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/get.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const path = '/v1/samples';
const samstoinit = require('../../../../cache/sampleStoreInit');
const expect = require('chai').expect;
const redisCache = require('../../../../cache/redisCache').client.cache;
const featureToggles = require('feature-toggles');
const enableRedisSampleStore =
  featureToggles.isFeatureEnabled('enableRedisSampleStore');

function testGetSamples() {
  describe('tests/cache/models/samples/get.js > cache the response >', () => {
    let token;
    const s1s2a1 = '___Subject1.___Subject2|___Aspect1';
    const s1s2a2 = '___Subject1.___Subject2|___Aspect2';
    const s1s3a1 = '___Subject1.___Subject3|___Aspect1';

    before((done) => {
      tu.toggleOverride('enableRedisSampleStore', true);
      tu.createToken()
        .then((returnedToken) => {
          token = returnedToken;
          done();
        })
        .catch(done);
    });

    before(rtu.populateRedis);
    after(rtu.forceDelete);
    after(tu.forceDeleteUser);

    after(() => {
      tu.toggleOverride('enableRedisSampleStore', enableRedisSampleStore);
    });

    it('get with wildcard should cache response', (done) => {
      api.get(`${path}?name=___Subj*`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          redisCache.get('___Subj*', (cacheErr, reply) => {
            if (cacheErr) {
              return done(cacheErr);
            }

            expect(JSON.parse(reply).length).to.be.equal(3);
            const sampNames = [s1s2a1, s1s2a2, s1s3a1];
            JSON.parse(reply).forEach((obj) => {
              expect(sampNames.includes(obj.name));
            });
            redisCache.del('___Subj*');
            return done();
          });
        });
    });

    it('get without wildcard should not cache response', (done) => {
      api.get(`${path}?name=___Subject1.___Subject2|___Aspect1`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          redisCache.get('___Subject1.___Subject2|___Aspect1',
            (cacheErr, reply) => {
              if (cacheErr || !reply) {
                expect(res.body.length).to.be.equal(1);
                expect(res.body[0].name).to.equal(s1s2a1);
                return done();
              }
            });
        });
    });

    it('do not return response from cache if ?fields are different', (done) => {
      api.get(`${path}?name=___Subj*`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          redisCache.get('___Subj*', (cacheErr, reply) => {
            if (cacheErr) {
              return done(cacheErr);
            }

            expect(JSON.parse(reply).length).to.be.equal(3);
            redisCache.get('___Subj*&fields=name,status', (cacheErr2, reply2) => {
              if (cacheErr2) {
                return done(cacheErr2);
              }

              expect(reply2).to.be.null;
              return done();
            });
          });
        });
    });
  });


  describe('tests/cache/models/samples/get.js, ' +
    `api::redisEnabled::GET ${path} >`, () => {
    let userId;
    let token;
    const s1a1 = '___Subject1|___Aspect1';
    const s1a2 = '___Subject1|___Aspect2';
    const s1s2a1 = '___Subject1.___Subject2|___Aspect1';
    const s1s2a2 = '___Subject1.___Subject2|___Aspect2';
    const s1s3a1 = '___Subject1.___Subject3|___Aspect1';
    const s1s3a2 = '___Subject1.___Subject3|___Aspect2';

    before((done) => {
      tu.toggleOverride('enableRedisSampleStore', true);
      tu.createUserAndToken()
        .then((obj) => {
          userId = obj.user.id;
          token = obj.token;
          done();
        })
        .catch(done);
    });

    after(tu.forceDeleteUser);
    after(() => tu.toggleOverride('enableRedisSampleStore',
      enableRedisSampleStore));

    describe('GET samples', () => {
      before(rtu.populateRedisSixSamples);
      after(rtu.forceDelete);

      describe('basic tests', () => {
        it('updatedAt and createdAt fields have the expected format', (done) => {
          api.get(path)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              for (let i = res.body.length - 1; i >= 0; i--) {
                const { updatedAt, createdAt } = res.body[i];
                expect(createdAt).to.equal(new Date(createdAt).toISOString());
                expect(updatedAt).to.equal(new Date(updatedAt).toISOString());
              }

              done();
            });
        });

        it('basic get: samples have statusChangedAt field', (done) => {
          api.get(path)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              res.body.forEach((sample) => {
                expect(sample.statusChangedAt).to.be.an('string');
              });
              done();
            });
        });

        it('basic get: aspect does not have statusChangedAt', (done) => {
          api.get(path)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              res.body.forEach((sample) => {
                expect(sample.aspect.statusChangedAt).to.be.undefined;
              });
              done();
            });
        });

        it('returns aspectId, subjectId, and NO aspect object', (done) => {
          api.get(path)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              for (let i = res.body.length - 1; i >= 0; i--) {
                expect(tu.looksLikeId(res.body[i].aspectId)).to.be.true;
                expect(tu.looksLikeId(res.body[i].subjectId)).to.be.true;
              }

              done();
            });
        });
      });

      describe('with filters >', () => {
        it('basic get all, sorted lexicographically by default', (done) => {
          api.get(path)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.length).to.be.equal(6);
              expect(res.body[0].name).to.be.equal(s1s2a1);
              expect(res.body[1].name).to.be.equal(s1s2a2);
              expect(res.body[2].name).to.be.equal(s1s3a1);
              expect(res.body[3].name).to.be.equal(s1s3a2);
              expect(res.body[4].name).to.be.equal(s1a1);
              expect(res.body[5].name).to.be.equal(s1a2);
              expect(res.body[0].status).to.be.equal('Critical');
              expect(res.body[0].value).to.be.equal('0');
              expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
              expect(res.body[0].relatedLinks).to.be.eql([
                { name: 'Salesforce', value: 'http://www.salesforce.com' },
              ]);
              done();
            });
        });

        it('basic get all, sorted lexicographically by name', (done) => {
          api.get(`${path}?sort=name`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.length).to.be.equal(6);
              expect(res.body[0].name).to.be.equal(s1s2a1);
              expect(res.body[1].name).to.be.equal(s1s2a2);
              expect(res.body[2].name).to.be.equal(s1s3a1);
              expect(res.body[3].name).to.be.equal(s1s3a2);
              expect(res.body[4].name).to.be.equal(s1a1);
              expect(res.body[5].name).to.be.equal(s1a2);
              expect(res.body[0].status).to.be.equal('Critical');
              expect(res.body[0].value).to.be.equal('0');
              expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
              expect(res.body[0].relatedLinks).to.be.eql([
                { name: 'Salesforce', value: 'http://www.salesforce.com' },
              ]);
              done();
            });
        });

        it('basic get all, sorted lexicographically by name, desc', (done) => {
          api.get(`${path}?sort=-name`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.length).to.be.equal(6);
              expect(res.body[5].name).to.be.equal(s1s2a1);
              expect(res.body[4].name).to.be.equal(s1s2a2);
              expect(res.body[3].name).to.be.equal(s1s3a1);
              expect(res.body[2].name).to.be.equal(s1s3a2);
              expect(res.body[1].name).to.be.equal(s1a1);
              expect(res.body[0].name).to.be.equal(s1a2);
              expect(res.body[5].status).to.be.equal('Critical');
              expect(res.body[5].value).to.be.equal('0');
              expect(res.body[5].aspect.name).to.be.equal('___Aspect1');
              expect(res.body[5].relatedLinks).to.be.eql([
                { name: 'Salesforce', value: 'http://www.salesforce.com' },
              ]);
              done();
            });
        });

        it('get all with fields filter', (done) => {
          api.get(`${path}?fields=name,status`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.length).to.be.equal(6);
              expect(res.body[0].name).to.be.equal(s1s2a1);
              expect(res.body[1].name).to.be.equal(s1s2a2);
              expect(res.body[2].name).to.be.equal(s1s3a1);
              expect(res.body[3].name).to.be.equal(s1s3a2);
              expect(res.body[4].name).to.be.equal(s1a1);
              expect(res.body[5].name).to.be.equal(s1a2);
              expect(res.body[0].status).to.be.equal('Critical');
              expect(res.body[0].value).to.be.undefined;
              expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
              expect(res.body[0].relatedLinks).to.be.undefined;
              expect(res.body[5].value).to.be.undefined;
              expect(res.body[5].aspect.name).to.be.equal('___Aspect2');
              expect(res.body[5].relatedLinks).to.be.undefined;
              done();
            });
        });

        it('get all, with limit filter', (done) => {
          api.get(`${path}?limit=2`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.length).to.be.equal(2);
              expect(res.body[0].name).to.be.equal(s1s2a1);
              expect(res.body[1].name).to.be.equal(s1s2a2);
              expect(res.body[0].status).to.be.equal('Critical');
              expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
              done();
            });
        });

        it('get all, with offset filter', (done) => {
          api.get(`${path}?offset=2`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.length).to.be.equal(4);
              expect(res.body[0].name).to.be.equal(s1s3a1);
              expect(res.body[1].name).to.be.equal(s1s3a2);
              done();
            });
        });

        it('name filter, one sample, no wildcard', (done) => {
          const NAME = '___Subject1.___Subject2|___Aspect2';
          api.get(path + '?name=' + NAME)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(1);
              expect(res.body[0].name).to.equal(NAME);
            })
            .end(done);
        });

        it('name filter, one sample, no wildcard, fields filter', (done) => {
          const NAME = '___Subject1.___Subject2|___Aspect2';
          api.get(path + `?name=${NAME}&fields=value,messageCode`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(1);
              expect(res.body[0].value).to.equal(String(50));
              expect(res.body[0].status).to.equal(undefined);
              expect(res.body[0].messageCode).to.equal(String(50));
            })
            .end(done);
        });

        it('name filter, multiple samples, no wildcard', (done) => {
          const NAME1 = '___Subject1.___Subject2|___Aspect2';
          const NAME2 = '___Subject1|___Aspect2';
          const NAME3 = '___Subject1.___Subject3|___Aspect2';
          api.get(path + `?name=${NAME1}, ${NAME2},${NAME3}`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(3);
              expect(res.body[0].name).to.equal(NAME1);
              expect(res.body[1].name).to.equal(NAME3);
              expect(res.body[2].name).to.equal(NAME2);
            })
            .end(done);
        });

        it('name filter, multiple samples, one does not exist', (done) => {
          const NAME1 = '___Subject1.___Subject2|___Aspect2';
          const NAME2 = '___Subject1|___NOTEXIST';
          const NAME3 = '___Subject1.___Subject3|___Aspect2';
          api.get(path + `?name=${NAME1}, ${NAME2},${NAME3}`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(2);
              expect(res.body[0].name).to.equal(NAME1);
              expect(res.body[1].name).to.equal(NAME3);
            })
            .end(done);
        });

        it('name filter, no wildcard, multiple samples, sort order,' +
          ' fields filter', (done) => {
          const sampS1S2A2 = '___Subject1.___Subject2|___Aspect2';
          const sampS1A2 = '___Subject1|___Aspect2';
          const sampS1S3A2 = '___Subject1.___Subject3|___Aspect2';
          api.get(path + `?name=${sampS1S2A2}, ${sampS1A2},${sampS1S3A2}` +
            '&sort=-status&fields=name,status')
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(3);
              expect(res.body[0].name).to.equal(sampS1S2A2);
              expect(res.body[0].status).to.equal('OK');
              expect(res.body[1].name).to.equal(sampS1A2);
              expect(res.body[1].status).to.equal('Invalid');
              expect(res.body[2].name).to.equal(sampS1S3A2);
              expect(res.body[2].status).to.equal('Invalid');

              res.body.forEach((samp) => {
                expect(samp.messageCode).to.equal(undefined);
              });
            })
            .end(done);
        });

        it('name filter, trailing asterisk', (done) => {
          api.get(path + `?name=___subject1.*`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(4);
              res.body.map((sample) => {
                expect(sample.name.startsWith('___Subject1.')).to.be.true;
              });
            })
            .end(done);
        });

        it('name filter, trailing asterisk, full subject name', (done) => {
          api.get(path + `?name=___subject1|*`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(2);
              res.body.map((sample) => {
                expect(sample.name.startsWith('___Subject1|')).to.be.true;
              });
            })
            .end(done);
        });

        it('name filter, leading asterisk, full asp name', (done) => {
          api.get(path + '?name=*|___Aspect1')
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(3);
              res.body.map((sample) => {
                expect(sample.name.endsWith('|___Aspect1')).to.be.true;
              });
            })
            .end(done);
        });

        it('name filter, one value, misc asterisks', (done) => {
          api.get(path + '?name=*Subject2*')
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(2);
              res.body.map((sample) => {
                expect(sample.name).to.contain('Subject2');
              });
            })
            .end(done);
        });

        it('get all, with sort option, default asc', (done) => {
          api.get(`${path}?sort=status,value`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.length).to.be.equal(6);
              expect(res.body[0].status).to.be.equal('Critical');
              expect(res.body[1].status).to.be.equal('Critical');
              expect(res.body[2].status).to.be.equal('Invalid');
              expect(res.body[3].status).to.be.equal('Invalid');
              expect(res.body[4].status).to.be.equal('Invalid');
              expect(res.body[5].status).to.be.equal('OK');
              expect(res.body[0].value).to.be.equal('0');
              expect(res.body[1].value).to.be.equal('0');
              expect(res.body[2].value).to.be.equal('-1');
              expect(res.body[3].value).to.be.equal('5');
              expect(res.body[4].value).to.be.equal('5');
              expect(res.body[5].value).to.be.equal('50');
              expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
              done();
            });
        });

        it('get all, with sort option, desc by status', (done) => {
          api.get(`${path}?sort=-status`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.length).to.be.equal(6);
              expect(res.body[0].status).to.be.equal('OK');
              expect(res.body[1].status).to.be.equal('Invalid');
              expect(res.body[2].status).to.be.equal('Invalid');
              expect(res.body[3].status).to.be.equal('Invalid');
              expect(res.body[4].status).to.be.equal('Critical');
              expect(res.body[5].status).to.be.equal('Critical');
              expect(res.body[0].aspect.name).to.be.equal('___Aspect2');
              done();
            });
        });

        it('get all, with name and status filter', (done) => {
          api.get(`${path}?name=___Subject1.___Subject2*&status=*cal`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.length).to.be.equal(1);
              expect(res.body[0].name).to.be.equal(s1s2a1);
              expect(res.body[0].status).to.be.equal('Critical');
              expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
              done();
            });
        });

        it('get all, with combined filters', (done) => {
          const filterstr = 'limit=5&offset=1&name=*___Aspect2&' +
            'sort=-value,status&fields=name,status,value';
          api.get(`${path}?${filterstr}`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.length).to.be.equal(2);
              expect(res.body[0].name).to.be.equal(s1s2a2);
              expect(res.body[1].name).to.be.equal(s1a2);
              expect(res.body[0].status).to.be.equal('OK');
              expect(res.body[1].status).to.be.equal('Invalid');
              expect(res.body[0].aspect.name).to.be.equal('___Aspect2');
              expect(res.body[0].relatedLinks).to.be.undefined;
              expect(res.body[0].value).to.be.equal('50');
              expect(res.body[1].value).to.be.equal('-1');
              done();
            });
        });

        it('no asterisk is treated as "equals" for value', (done) => {
          api.get(path + '?value=' + 50)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(1);
              expect(res.body[0].value).to.equal(String(50));
            })
            .end(done);
        });

        it('filter by status and limit, status as first param', (done) => {
          api.get(path + '?status=Invalid&limit=2')
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(2);
              expect(res.body[0].name).to.equal(s1s3a1);
              expect(res.body[1].name).to.equal(s1s3a2);
              res.body.forEach((obj) => {
                expect(obj.status).to.equal('Invalid');
              });
            })
            .end(done);
        });

        it('filter by status and limit, status as second param', (done) => {
          api.get(path + '?limit=2&status=Critical')
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(2);
              expect(res.body[0].name).to.equal(s1s2a1);
              expect(res.body[1].name).to.equal(s1a1);
              res.body.forEach((obj) => {
                expect(obj.status).to.equal('Critical');
              });
            })
            .end(done);
        });

        it('filter by value, sort by status', (done) => {
          api.get(path + '?value=5&sort=-name')
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(2);
              expect(res.body[0].name).to.equal(s1s3a2);
              expect(res.body[1].name).to.equal(s1s3a1);
              res.body.forEach((obj) => {
                expect(obj.value).to.equal(String(5));
              });
            })
            .end(done);
        });

        it('filter by messageCode.', (done) => {
          api.get(path + '?messageCode=' + 10)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(1);
              expect(res.body[0].messageCode).to.equal(String(10));
            })
            .end(done);
        });

        it('filter by status', (done) => {
          api.get(path + '?status=Critical')
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(2);
              expect(res.body[0].status).to.equal('Critical');
            })
            .end(done);
        });

        it('filter by previousStatus', (done) => {
          api.get(path + '?previousStatus=Critical')
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect((res) => {
              expect(res.body.length).to.equal(1);
              expect(res.body[0].previousStatus).to.equal('Critical');
              expect(res.body[0].status).to.equal('Invalid');
            })
            .end(done);
        });

        it('createdAt and updatedAt fields have the expected format', (done) => {
          const sampleName = s1s3a1;
          api.get(`${path}/${sampleName}`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const { updatedAt, createdAt } = res.body;
              expect(updatedAt).to.equal(new Date(updatedAt).toISOString());
              expect(createdAt).to.equal(new Date(createdAt).toISOString());
              done();
            });
        });

        it('basic get by name, OK', (done) => {
          const sampleName = s1s3a1;
          api.get(`${path}/${sampleName}`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.name).to.be.equal(s1s3a1);
              expect(res.body.status).to.be.equal('Invalid');
              expect(res.body.value).to.be.equal('5');
              expect(res.body.relatedLinks).to.be.eql([
                { name: 'Salesforce', value: 'http://www.salesforce.com' },
              ]);
              expect(res.body.apiLinks).to.be.eql([
                {
                  href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
                  method: 'DELETE',
                  rel: 'Delete this sample',
                },
                {
                  href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
                  method: 'GET',
                  rel: 'Retrieve this sample',
                },
                {
                  href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
                  method: 'PATCH',
                  rel: 'Update selected attributes of this sample',
                },
                {
                  href: '/v1/samples',
                  method: 'POST',
                  rel: 'Create a new sample',
                },
                {
                  href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
                  method: 'PUT',
                  rel: 'Overwrite all attributes of this sample',
                },
              ]);
              expect(res.body.aspect.name).to.be.equal('___Aspect1');
              expect(res.body.aspect.relatedLinks).to.be.eql([
                { name: 'Google', value: 'http://www.google.com' },
                { name: 'Yahoo', value: 'http://www.yahoo.com' },
              ]);
              expect(res.body.aspect.criticalRange).to.be.eql([0, 1]);
              done();
            });
        });

        it('get by name is case in-sensitive', (done) => {
          const sampleName = '___subject1.___SUBJECT3|___AspECT1';
          api.get(`${path}/${sampleName}`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.name).to.equal(s1s3a1);
              done();
            });
        });

        it('get by name, wrong name', (done) => {
          const sampleName = 'abc';
          api.get(`${path}/${sampleName}`)
            .set('Authorization', token)
            .expect(constants.httpStatus.NOT_FOUND)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.errors[0].description)
                .to.be.equal('Invalid sample name "abc"');
              return done();
            });
        });

        it('get by name, sample not found', (done) => {
          const sampleName = 'abc|xyz';
          api.get(`${path}/${sampleName}`)
            .set('Authorization', token)
            .expect(constants.httpStatus.NOT_FOUND)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.errors[0].description)
                .to.be.equal('Sample/Aspect not found.');
              return done();
            });
        });

        it('get by name, with fields filter', (done) => {
          const sampleName = s1s3a1;
          api.get(`${path}/${sampleName}?fields=name,value`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.name).to.be.equal(s1s3a1);
              expect(res.body.status).to.be.undefined;
              expect(res.body.value).to.be.equal('5');
              expect(res.body.relatedLinks).to.be.undefined;
              expect(res.body).to.have.property('apiLinks').that.is.an('array');
              expect(res.body.aspect.name).to.be.equal('___Aspect1');
              expect(res.body.aspect.relatedLinks).to.be.eql([
                { name: 'Google', value: 'http://www.google.com' },
                { name: 'Yahoo', value: 'http://www.yahoo.com' },
              ]);
              expect(res.body.aspect.criticalRange).to.be.eql([0, 1]);
              done();
            });
        });

        it('get by name with incorrect fields filter gives error', (done) => {
          const sampleName = s1s3a1;
          api.get(`${path}/${sampleName}?fields=name,y`)
            .set('Authorization', token)
            .expect(constants.httpStatus.BAD_REQUEST)
            .end(done);
        });
      });

    });

    describe('should return user object with profile field >', () => {
      const Aspect = tu.db.Aspect;
      const Subject = tu.db.Subject;
      const Sample = tu.db.Sample;
      let a1;
      let a2;
      let s1;
      let s2;
      let s3;
      before((done) => {
        Aspect.create({
          isPublished: true,
          name: `${tu.namePrefix}Aspect1`,
          timeout: '30s',
          valueType: 'NUMERIC',
          criticalRange: [0, 1],
          relatedLinks: [
            { name: 'Google', value: 'http://www.google.com' },
            { name: 'Yahoo', value: 'http://www.yahoo.com' },
          ],
        })
          .then((created) => (a1 = created))
          .then(() => Aspect.create({
            isPublished: true,
            name: `${tu.namePrefix}Aspect2`,
            timeout: '10m',
            valueType: 'NUMERIC',
            okRange: [10, 100],
          }))
          .then((created) => (a2 = created))
          .then(() => Subject.create({
            isPublished: true,
            name: `${tu.namePrefix}Subject1`,
          }))
          .then((created) => (s1 = created))
          .then(() => Subject.create({
            isPublished: true,
            name: `${tu.namePrefix}Subject2`,
            parentId: s1.id,
          }))
          .then((created) => (s2 = created))
          .then(() => Subject.create({
            isPublished: true,
            name: `${tu.namePrefix}Subject3`,
            parentId: s1.id,
          }))
          .then((created) => (s3 = created))
          .then(() => Sample.create({
            provider: userId,
            messageCode: '25',
            subjectId: s2.id,
            aspectId: a1.id,
            value: '0',
            relatedLinks: [
              { name: 'Salesforce', value: 'http://www.salesforce.com' },
            ],
          }))
          .then(() => Sample.create({
            provider: userId,
            messageCode: '50',
            subjectId: s2.id,
            aspectId: a2.id,
            value: '50',
            relatedLinks: [
              { name: 'Salesforce', value: 'http://www.salesforce.com' },
            ],
          }))
          .then(() => Sample.create({
            provider: userId,
            previousStatus: 'Critical',
            messageCode: '10',
            subjectId: s3.id,
            aspectId: a1.id,
            value: '5',
            relatedLinks: [
              { name: 'Salesforce', value: 'http://www.salesforce.com' },
            ],
          }))
          .then(() => samstoinit.populate())
          .then(() => done())
          .catch(done);
      });
      after(rtu.forceDelete);

      it('get all contains user and profile object', (done) => {
        api.get(path)
          .set('Authorization', token)
          .expect(constants.httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.header).to.have.property('x-total-count', '3');
            for (let i = res.body.length - 1; i >= 0; i--) {
              const { user } = res.body[i];
              expect(user).to.be.an('object');
              expect(user.name).to.be.an('string');
              expect(user.email).to.be.an('string');
              expect(user.profile).to.be.an('object');
              expect(user.profile.name).to.be.an('string');
            }

            done();
          });
      });

      it('get by name contains user and profile object', (done) => {
        const sampleName = '___subject1.___SUBJECT3|___AspECT1';
        api.get(`${path}/${sampleName}`)
          .set('Authorization', token)
          .expect(constants.httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const { user } = res.body;
            expect(user).to.be.an('object');
            expect(user.name).to.be.an('string');
            expect(user.email).to.be.an('string');
            expect(user.profile).to.be.an('object');
            expect(user.profile.name).to.be.an('string');
            done();
          });
      });
    });
  });
}

describe('tests/cache/models/samples/get.js  >', () => {
  testGetSamples();

  describe(' with optimizeSampleFilteredGets toggle on >', () => {
    const toggleName = 'optimizeSampleFilteredGets';
    const initialFeatureState = featureToggles
      .isFeatureEnabled(toggleName);
    before(() => tu.toggleOverride(toggleName, true));
    after(() => tu.toggleOverride(toggleName,
      initialFeatureState));
    testGetSamples();
  });
});
