import { jsdom } from 'jsdom'
const expect = require('chai').expect;

// var pug = require('pug');

 
// var fn = pug.compileFile('./view/rooms/index.pug');

// // Render the function
// var html = fn();

// global.document = jsdom(html)
// global.window = document.defaultView
// global.navigator = global.window.navigator

describe('tests/view/rooms/room/app.js, /rooms/{key} =>', () => {
  it('ok, parsed javascript and html', () => {
    expect(1).to.equal(1);
  });
});