
import request from 'superagent';
const u = require('../utils');

window.onload = () => {
  request.get('/v1/perspectives')
  .set({
    Authorization: u.getCookie('Authorization'),
    'X-Requested-With': 'XMLHttpRequest',
    Expires: '-1',
    'Cache-Control': 'no-cache,no-store,must-revalidate,max-age=-1,private',
  })
  .end((err, res) => {
    if (err) {
      document.getElementById('errorInfo').innerHTML =
      'An unexpected error occurred.';
    } else {
      for (let i = 0; i < res.body.length; i++) {
        let url = window.location.href;
        if (url.lastIndexOf('/') === (url.length - 1)) {
          url += res.body[i].name;
        } else {
          url += '/' + res.body[i].name;
        }

        const centerLinks = document.getElementById('center-links');
        centerLinks.appendChild(document.createElement('div'));
        const a = document.createElement('a');
        const linkText = document.createTextNode(res.body[i].name);
        a.appendChild(linkText);
        a.href = url;
        centerLinks.appendChild(a);
      }
    }
  });
};
