const request = require('superagent');
const ipWhitelistApplication = process.env.IP_WHITELIST_APPLICATION;
const path = 'v1/verify';

module.exports = (req, res, next) => {
  let ipAddr = '';
  if (req.headers && req.headers['x-forwarded-for']) {
    ipAddr = req.headers['x-forwarded-for'];
    console.log(`whitelist|x-forwarded-for|${ipAddr}`);
  } else if (req.connection && req.connection.remoteAddress) {
    ipAddr = req.connection.remoteAddress;
    console.log(`whitelist|remoteAddress|${ipAddr}`);
  }

  request.get(`${ipWhitelistApplication}/${path}/${i}`)
    .then((_res) => {
      console.log(`whitelist|response|${_res.status}|${_res.body}`);
      if (_res.status === 200 && _res.body.allow === true) {
        return next();
      };

      const err = new Error('Access denied');
      err.name = 'Unauthorized';
      err.explanation = 'Unauthorized';
      err.status = 401;
      console.log('whitelist|unauthorized', err);
      return next(err);
    })
    .catch(next);
};
