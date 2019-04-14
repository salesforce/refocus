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

  const arr = ipAddr.split(',').map((a) => a.trim());
  const promises = arr.map((i) =>
    request.get(`${ipWhitelistApplication}/${path}/${i}`)
      .then((_res) => {
        console.log('whitelist response', _res.status, _res.body);
        Promise.resolve(_res.status === 200 && _res.body.allow)
      }));
  if (promises.every((p) => {
    console.log(`whitelist|${p}`);
    return p;
  })) {
    return next();
  }

  const err = new Error('Access denied');
  err.name = 'Unauthorized';
  err.explanation = 'Unauthorized';
  err.status = 401;
  next(err);
};
