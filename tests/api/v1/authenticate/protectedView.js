/**
 * tests/api/v1/authenticate/protectedView.js
 */

'use strict'; // eslint-disable-line strict

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const lensPath = '/focusRtBracket';


describe(`api: protected views`, () => {
  it('lens path redirects to login', (done) => {
    api.get(lensPath)
    .expect((res) => expect(res.redirect).to.be.true)
    .expect((res) => {
      expect(res.header.location).to.contain('/login');
    })
    .end((err) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });
});

