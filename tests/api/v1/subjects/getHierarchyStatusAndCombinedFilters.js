/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/getHierarchyStatusAndCombinedFilters.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const path = '/v1/subjects/{key}/hierarchy';
const expect = require('chai').expect;

describe(`api: GET ${path}:`, () => {
  let token;
  // The below code creates the following hierarchy.
  // gp
  //  |parOther1
  //  |parOther2 - [subjectTags: ea]
  //  |par-[subjectTags - na] - [sample2: humidity[tags: hum], sample1: temperature[tags: temp]]
  //      |chi - [sample3: humidity]
  //          |grn - subjectTags[cold,verycold],[sample4: wind-speed[tags: wnd]]

  let gp = { name: `${tu.namePrefix}America`, isPublished: true };
  let par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true,
              tags: [
                { name: 'na', associatedModelName: 'Subject' }
              ],
            };
  let parOther1 = { name: `${tu.namePrefix}SouthAmerica`, isPublished: true };
  let parOther2 = { name: `${tu.namePrefix}EastAmerica`, isPublished: true,
                    tags: [
                      { name: 'ea', associatedModelName: 'Subject' }
                    ],
                  };
  let chi = { name: `${tu.namePrefix}Canada`, isPublished: true };
  let grn = { name: `${tu.namePrefix}Quebec`, isPublished: true,
              tags: [
                { name: 'cold', associatedModelName: 'Subject' },
                { name: 'verycold', associatedModelName: 'Subject' }
              ],
            };
  const aspectTemp = {
    criticalRange: [3, 5],
    name: 'temperature',
    timeout: '60s',
    isPublished: true,
    tags: [
      { name: 'temp', associatedModelName: 'Aspect' }
    ],
  };
  const aspectHumid = {
    infoRange: [1, 1],
    name: 'humidity',
    timeout: '60s',
    isPublished: true,
  };
  const aspectWind = {
    name: 'wind-speed',
    timeout: '60s',
    isPublished: true,
    tags: [
      { name: 'wnd', associatedModelName: 'Aspect' }
    ],
  };

  const sample1 = { value: '4' };
  const sample2 = { value: '1' };
  const sample3 = { value: '1' };
  const sample4 = { value: '100' };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    Subject.create(gp)
    .then((subj) => {
      gp = subj;
      par.parentId = gp.id;
      parOther1.parentId = gp.id;
      parOther2.parentId = gp.id;
      return Subject.create(par,
        { include: Subject.getSubjectAssociations().tags });
    })
    .then((subj) => {
      par = subj;
      chi.parentId = par.id;
      sample1.subjectId = subj.id;
      sample2.subjectId = subj.id;
      return Subject.create(chi);
    })
    .then((subj) => {
      chi = subj;
      sample3.subjectId = subj.id;
      grn.parentId = chi.id;
      return Subject.create(grn,
        { include: Subject.getSubjectAssociations().tags });
    })
    .then((subj) => {
      grn = subj;
      return tu.db.Aspect.create(aspectHumid);
    })
    .then((a) => {
      sample2.aspectId = a.id;
      sample3.aspectId = a.id;
      return tu.db.Aspect.create(aspectTemp,
        { include: tu.db.Aspect.getAspectAssociations().tags });
    })
    .then((a) => {
      sample1.aspectId = a.id;
      return tu.db.Sample.create(sample1);
    })
    .then(() => {
      return tu.db.Sample.create(sample2);
    })
    .then(() => {
      return tu.db.Sample.create(sample3);
    })
    .then(() => {
      return tu.db.Subject.create(parOther1);
    })
    .then((subj) => {
      parOther1 = subj;
      return tu.db.Subject.create(parOther2,
        { include: Subject.getSubjectAssociations().tags });
    })
    .then((subj) => {
      parOther2 = subj;
      return Aspect.create(aspectWind,
        { include: Aspect.getAspectAssociations().tags });
    })
    .then((a) => {
      sample4.aspectId = a.id;
      sample4.subjectId = grn.id;
      return tu.db.Sample.create(sample4);
    })
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('Sample Status filter', () => {
    it('filter :: status=critical',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?status=Critical';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].samples[0].aspect.name)
          .to.equal('temperature');
        expect(res.body.children[0].samples[0].status)
          .to.equal('Critical');
        expect(res.body.children[0].children).to.have.length(0);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('multiple query params :: filter :: status=Critical,Info',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?status=Critical,Info';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(2);
        const samples = res.body.children[0].samples;
        for(let i = 0; i < samples.length; i++) {
          if(samples[i].name.includes('humidity')) {
            expect(samples[i].status).equal('Info');
          } else if(samples[i].name.includes('temperature')) {
            expect(samples[i].status).equal('Critical');
          }
        }
        expect(res.body.children[0].children[0].samples).to.have.length(1);
        expect(res.body.children[0].children[0].samples[0].status)
          .to.equal('Info');
        expect(res.body.children[0].children[0].children).to.have.length(0);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
    it('negation :: filter :: status=-Critical',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?status=-Critical';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
         // north america. Check to make sure it does not return the parOther
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].samples[0].status).equal('Info');
        expect(res.body.children[0].children[0].samples).to.have.length(1);
        expect(res.body.children[0].children[0].samples[0].status)
          .to.equal('Info');
        const quebecSubj = res.body.children[0].children[0].children[0];
        expect(quebecSubj.samples[0].status).to.equal('Invalid');
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
  });
  describe('aspect + status filters', () => {
    it('filter:: aspect=wind-speed and status=Invalid', (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?aspect=wind-speed&status=Invalid';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
         // north america. Check to make sure it does not return the parOther
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(0);
        expect(res.body.children[0].children[0].samples).to.have.length(0);
        const quebecSubj = res.body.children[0].children[0].children[0];
        expect(quebecSubj.samples[0].status).to.equal('Invalid');
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
    it('negation:: filter:: aspect=-wind-speed and status=-Invalid', (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?aspect=-wind-speed&status=-Invalid';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
         // north america. Check to make sure it does not return the parOther
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(2);
        const samples = res.body.children[0].samples;
        for(let i = 0; i < samples.length; i++) {
          if(samples[i].name.includes('humidity')) {
            expect(samples[i].status).equal('Info');
          } else if(samples[i].name.includes('temperature')) {
            expect(samples[i].status).equal('Critical');
          }
        }
        expect(res.body.children[0].children[0].samples).to.have.length(1);
        expect(res.body.children[0].children[0].samples[0].status)
          .to.equal('Info');
        expect(res.body.children[0].children[0].children).to.have.length(0);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
    it('negation:: filter:: aspect=-wind-speed and status=-Invalid,-Critical',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?aspect=-wind-speed&status=-Invalid,-Critical';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(1);
        const samples = res.body.children[0].samples;
        expect(samples[0].status).equal('Info');
        expect(res.body.children[0].children[0].samples).to.have.length(1);
        expect(res.body.children[0].children[0].samples[0].status)
          .to.equal('Info');
        expect(res.body.children[0].children[0].children).to.have.length(0);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
  });

  describe('aspect + subjectTags filters', () => {
    it('filter:: subjectTags=cold&aspect=wind-speed', (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?subjectTags=cold&aspect=wind-speed';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        // north america. Check to make sure it does not return the parOther
        expect(res.body.children).to.have.length(1);
        // canada
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(0);
        // quebec
        expect(res.body.children[0].children[0].samples).to.have.length(0);
        const quebecSubj = res.body.children[0].children[0].children[0];
        expect(quebecSubj.tags[0].name).to.contain('cold');
        expect(quebecSubj.samples[0].aspect.name).to.equal('wind-speed');
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('filter:: subjectTags=cold,na&aspect=temperature,wind-speed', (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?subjectTags=cold,na&aspect=temperature,wind-speed';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        const na = res.body.children[0];
        expect(na.samples).to.have.length(1);
        expect(na.samples[0]).to.have.deep
          .property('aspect.name', 'temperature');
        expect(na.children).to.have.length(1);
        expect(na.children[0].samples).to.have.length(0);
        expect(na.children[0].children).to.have.length(1);
        expect(na.children[0].children[0].samples).to.have.length(1);
        const quebecSubj = na.children[0].children[0];
        expect(quebecSubj.tags[0].name).to.contain('cold');
        expect(quebecSubj.samples[0].aspect.name).to.equal('wind-speed');
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('filter :: subjectTags=-cold  and aspect=temperature', (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?subjectTags=-cold&aspect=temperature';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        // north america. Check to make sure it does not return the parOther
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].samples[0]
          .aspect.name).to.equal('temperature');
        expect(res.body.children[0].children).to.have.length(0);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
  });

  describe('All params combined filters', () => {
    it('filter :: subjectTags=na and aspect=humidity,wind-speed&,aspectTags=hum',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?subjectTags=na,ea&aspect=temperature&aspectTags=temp,hum';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].tags[0].name).to.equal('na');
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].samples[0].aspect.name)
          .to.equal('temperature');
        expect(res.body.children[0].samples[0].aspect.tags[0].name)
          .to.equal('temp');
        expect(res.body.children[0].children).to.have.length(0);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('filter :: subjectTags=na and aspect=humidity,wind-speed and '+
    'aspectTags=hum and status = Critical',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) +
    '?subjectTags=na,ea&aspect=temperature&aspectTags=temp,hum&status=Critical';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].tags[0].name).to.equal('na');
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].samples[0].aspect.name)
          .to.equal('temperature');
        expect(res.body.children[0].samples[0].aspect.tags[0].name)
          .to.equal('temp');
        expect(res.body.children[0].children).to.have.length(0);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
    it('filter :: subjectTags=na,ea and aspect=temperature and '+
    'aspectTags=temp,hum and status = -Critical',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) +
  '?subjectTags=na,ea&aspect=temperature&aspectTags=temp,hum&status=-Critical';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(0);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
  });
  describe('Filters should not be case sensitive', () => {
    it('Filter with all upper case:: filter :: status=Critical,Info',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?status=CRITICAL,INFO';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(2);
        const samples = res.body.children[0].samples;
        for(let i = 0; i < samples.length; i++) {
          if(samples[i].name.includes('humidity')) {
            expect(samples[i].status).equal('Info');
          } else if(samples[i].name.includes('temperature')) {
            expect(samples[i].status).equal('Critical');
          }
        }
        expect(res.body.children[0].children[0].samples).to.have.length(1);
        expect(res.body.children[0].children[0].samples[0].status)
          .to.equal('Info');
        expect(res.body.children[0].children[0].children).to.have.length(0);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
    it('filter:: mixed cases:: aspect=wind-speed'
      + 'and status=Invalid', (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?aspect=Wind-Speed&status=InvaLid';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
         // north america. Check to make sure it does not return the parOther
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(0);
        expect(res.body.children[0].children[0].samples).to.have.length(0);
        const quebecSubj = res.body.children[0].children[0].children[0];
        expect(quebecSubj.samples[0].status).to.equal('Invalid');
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
    it('All filters Mixed case :: subjectTags=Na,ea and aspect=tempeRature' +
      'and aspectTags=temp,HUM',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) +
              '?subjectTags=Na,ea&aspect=tempeRature&aspectTags=temp,HUM';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].tags[0].name).to.equal('na');
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].samples[0].aspect.name)
          .to.equal('temperature');
        expect(res.body.children[0].samples[0].aspect.tags[0].name)
          .to.equal('temp');
        expect(res.body.children[0].children).to.have.length(0);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
  });
});
