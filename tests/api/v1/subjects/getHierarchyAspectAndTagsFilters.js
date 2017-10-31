/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/getHierarchyAspectAndTagsFilters.js
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

describe('tests/api/v1/subjects/getHierarchyAspectAndTagsFilters.js, ' +
`GET ${path} >`, () => {
  let token;

  //
  // the before hook creates this following hierarchy
  // gp
  //  |parOther1
  //  |parOther2 - [subjectTags: ea]
  //  |par - [sample2: humidity[tags: hum], sample1: temperature[tags: temp]]
  //    |chi - [sample3: humidity[tags: hum]]
  //      |grn - subjectTags[cold,verycold],[sample4: wind-speed[tags: wnd]]

  let gp = { name: `${tu.namePrefix}America`, isPublished: true };
  let par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  let parOther1 = { name: `${tu.namePrefix}SouthAmerica`, isPublished: true };
  let parOther2 = {
    name: `${tu.namePrefix}EastAmerica`,
    isPublished: true,
    tags: ['ea'],
  };
  let chi = { name: `${tu.namePrefix}Canada`, isPublished: true };
  let grn = {
    name: `${tu.namePrefix}Quebec`,
    isPublished: true,
    tags: ['cold', 'verycold'],
  };
  const aspectTemp = {
    name: 'temperature',
    timeout: '30s',
    isPublished: true,
    tags: ['temp'],
  };
  const aspectHumid = {
    name: 'humidity',
    timeout: '30s',
    isPublished: true,
  };
  const aspectWind = {
    name: 'wind-speed',
    timeout: '30s',
    isPublished: true,
    tags: ['wnd'],
  };

  const sample1 = { value: '10' };
  const sample2 = { value: '10' };
  const sample3 = { value: '10' };
  const sample4 = { value: '100' };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Subject.create(gp)
    .then((subj) => {
      gp = subj;
      par.parentId = gp.id;
      parOther1.parentId = gp.id;
      parOther2.parentId = gp.id;
      return Subject.create(par);
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
      return Subject.create(grn);
    })
    .then((subj) => {
      grn = subj;
      return tu.db.Aspect.create(aspectHumid);
    })
    .then((a) => {
      sample2.aspectId = a.id;
      sample3.aspectId = a.id;
      return tu.db.Aspect.create(aspectTemp);
    })
    .then((a) => {
      sample1.aspectId = a.id;
      return tu.db.Sample.create(sample1);
    })
    .then(() => tu.db.Sample.create(sample2))
    .then(() => tu.db.Sample.create(sample3))
    .then(() => tu.db.Subject.create(parOther1))
    .then((subj) => {
      parOther1 = subj;
      return tu.db.Subject.create(parOther2);
    })
    .then((subj) => {
      parOther2 = subj;
      return Aspect.create(aspectWind);
    })
    .then((a) => {
      sample4.aspectId = a.id;
      sample4.subjectId = grn.id;
      return tu.db.Sample.create(sample4);
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('SubjectTag filter on hierarchy >', () => {
    it('Only subjects matching the tag and its hierarchy should be returned',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) + '?subjectTags=cold';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);

        // north america. Check to make sure it does not return the parOther
        expect(res.body.children).to.have.length(1);

        // canada
        expect(res.body.children[0].children).to.have.length(1);

        // quebec
        const quebecSubj = res.body.children[0].children[0].children[0];
        expect(quebecSubj.tags).to.include.members(['cold']);
      })
      .end(done);
    });

    it('Multiple Query Params: Only subjects matching the tag and' +
    ' its hierarchy should be returned', (done) => {
      const endpoint = path.replace('{key}', gp.id) +
        '?subjectTags=cold,ea,verycold';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);

        // north america. Check to make sure it does not return the parOther
        expect(res.body.children).to.have.length(2);

        // canada
        let na = null;
        for (let i = 0; i < res.body.children.length; i++) {
          if (res.body.children[i].name === '___NorthAmerica') {
            na = res.body.children[i];
            break;
          }
        }

        expect(na).to.not.equal(null);
        expect(na.children).to.have.length(1);
        expect(na.children[0].children).to.have.length(1);
        expect(na.children[0].children[0].tags).to.include.members(['cold']);
      })
      .end(done);
    });

    it('Negation test: Subject with tags not matching the negated tag name ',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) + '?subjectTags=-verycold';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(3);
      })
      .end(done);
    });

    it('Negation test: Multiple Tags: Subject with tags not matching the ' +
      'negated tag name', (done) => {
      const endpoint = path.replace('{key}', gp.id) + '?subjectTags=-cold,-ea';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(2);
      })
      .end(done);
    });

    it('Multiple Query Params: Tags should be passed as include filter' +
    'or exclude filter not the combination of both', (done) => {
      const endpoint = path.replace('{key}', gp.id) +
        '?subjectTags=-cold,ea,-verycold';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to
        .equal('InvalidFilterParameterError');
        done();
      });
    });

    it('Multiple Query Params: Tags should be passed as include filter' +
    'or exclude filter not the combination of both', (done) => {
      const endpoint = path.replace('{key}', gp.id) +
        '?subjectTags=cold,-ea,verycold';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body.errors[0].type).to
        .equal('InvalidFilterParameterError');
      })
      .end(done);
    });

    it('subjectTags field not included', (done) => {
      const endpoint = path.replace('{key}', gp.id)
        + '?subjectTags=cold&fields=name';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);

        // north america. Check to make sure it does not return the parOther
        expect(res.body.children).to.have.length(1);
        expect(res.body).to.not.have.property('tags');
        expect(res.body).to.have.all
        .keys(['name', 'id', 'samples', 'children', 'apiLinks']);

        // canada
        expect(res.body.children[0].children).to.have.length(1);

        // quebec
        const quebecSubj = res.body.children[0].children[0].children[0];
        expect(quebecSubj.tags).to.include.members(['cold']);

      })
      .end(done);
    });
  });

  describe('Aspect Filter on Hierarchy >', () => {
    it('should return samples with temperature and humidity aspects',
    (done) => {
      const endpoint = path.replace('{key}', par.id) +
        '?aspect=humidity,temperature';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(res.body.samples).to.have.length(2);
      })
      .end(done);
    });

    it('should return sample with just humidity aspect', (done) => {
      const endpoint = path.replace('{key}', par.id) + '?aspect=humidity';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(res.body.children).to.have.length(1);
        expect(res.body.samples).to.have.length(1);
        expect(res.body.samples[0]).to.have.deep
          .property('aspect.name', 'humidity');
        expect(res.body.children[0].samples[0]).to.have.deep
          .property('aspect.name', 'humidity');
        expect(res.body.children[0].children).to.have.length(0);
      })
      .end(done);
    });

    it('test negitation humidity but no temperature', (done) => {
      const endpoint = path.replace('{key}', par.id) + '?aspect=-temperature';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(res.body.samples).to.have.length(1);
        expect(res.body.samples[0]).to.have.deep
          .property('aspect.name', 'humidity');
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].samples[0]).to.have.deep
        .property('aspect.name', 'humidity');
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].children[0].samples[0]).to.have.deep
        .property('aspect.name', 'wind-speed');
      })
      .end(done);
    });

    it('test with aspect name not in the hierarchy', (done) => {
      const endpoint2 = path.replace('{key}', par.id) + '?aspect=invalidName';
      api.get(endpoint2)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(Object.keys(res.body.samples)).to.have.length(0);
      })
      .end(done);
    });

    it('filter should apply to all levels of hierarchy', (done) => {
      const endpoint2 = path.replace('{key}', par.id) +
        '?aspect=humidity,temperature';
      api.get(endpoint2)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.not.equal(null);
        expect(res.body.samples).to.have.length(2);
        const aspectNames = [];
        aspectNames.push(res.body.samples[0].aspect.name);
        aspectNames.push(res.body.samples[1].aspect.name);
        expect(aspectNames).to.include.members(['humidity', 'temperature']);
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].children).to.have.length(0);
        expect(res.body.children[0].samples[0])
        .to.have.deep.property('aspect.name', 'humidity');
        done();
      });
    });

    it('filter with aspect name having a hyphen', (done) => {
      const endpoint2 = path.replace('{key}', par.id) + '?aspect=wind-speed';
      api.get(endpoint2)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(res.body.samples).to.have.length(0);
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(0);
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].children[0].samples).to.have.length(1);
        expect(res.body.children[0].children[0].samples[0])
        .to.have.deep.property('aspect.name', 'wind-speed');
      })
      .end(done);
    });

    it('negation on aspect name filter with aspect name ' +
    'having a hyphen', (done) => {
      const endpoint2 = path.replace('{key}', par.id) + '?aspect=-wind-speed';
      api.get(endpoint2)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(res.body.samples).to.have.length(2);
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].children).to.have.length(0);
      })
      .end(done);
    });
  });

  describe('aspectTags filter on hierarchy >', () => {
    it('Hierarchy for subject with Aspect tags matching the query params ' +
    'should be returned', (done) => {
      const endpoint = path.replace('{key}', chi.id) + '?aspectTags=wnd';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(res.body.samples).to.have.length(0);
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].samples[0])
        .to.have.deep.property('aspect.name', 'wind-speed');
      })
      .end(done);
    });

    it('Hierarchy for subject with Aspect tags matching the query params ' +
    'should be returned', (done) => {
      const endpoint = path.replace('{key}', gp.id) + '?aspectTags=notpresent';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(res.body.samples).to.have.length(0);
        expect(res.body.children).to.have.length(0);
      })
      .end(done);
    });

    it('Multiple Query Params: Hierarchy for subject with Aspect tags' +
      ' matching the query params should be returned',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) + '?aspectTags=wnd,temp';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.samples).to.have.length(0);
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].samples[0].aspect.tags[0])
        .to.equal('temp');
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].children[0].samples).to.have.length(0);
        expect(res.body.children[0].children[0].children).to.have.length(1);
        expect(res.body.children[0].children[0].children[0].samples)
        .to.have.length(1);
        expect(res.body.children[0].children[0].children[0]
          .samples[0].aspect.tags[0]).to.equal('wnd');
      })
      .end(done);
    });

    it('Negation: Hierarchy for subject with Aspect tags' +
      ' matching the query params should be returned',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) + '?aspectTags=-temp';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.samples).to.have.length(0);
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].samples).to.have.length(1);
        expect(res.body.children[0].children).to.have.length(1);
        expect(res.body.children[0].children[0].samples).to.have.length(1);
        expect(res.body.children[0].children[0].children).to.have.length(1);
        expect(res.body.children[0].children[0].children[0].samples)
        .to.have.length(1);
        expect(res.body.children[0].children[0].children[0]
          .samples[0].aspect.tags[0]).to.equal('wnd');
      })
      .end(done);
    });

    it('Negation: Multiple Query Params: Hierarchy for subject with Aspect' +
      ' tags matching the query params should be returned',
    (done) => {
      const endpoint = path.replace('{key}', gp.id) + '?aspectTags=-temp,-wnd';
      api.get(endpoint)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.samples).to.have.length(0);
        expect(res.body.children).to.have.length(1);
      })
      .end(done);
    });
  });
});
