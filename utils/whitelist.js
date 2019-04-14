const request = require('superagent');
const ipWhitelistApplication = process.env.IP_WHITELIST_APPLICATION;
const path = 'v1/verify';

module.exports = (req, res, next) => {
  let ipAddr = '';
  if (req.headers && req.headers['x-forwarded-for']) {
    ipAddr = req.headers['x-forwarded-for'];
  } else if (req.connection && req.connection.remoteAddress) {
    ipAddr = req.connection.remoteAddress;
  }

  const arr = ipAddr.split(',').map((a) => a.trim());
  const promises = arr.map((i) =>
    request.get(`${ipWhitelistApplication}/${path}/${i}`)
      .then((_res) => Promise.resolve(_res.status === 200 && _res.body.allow)));
  if (promises.every((p) => p)) {
    return next();
  }

  return next('Permission Denied');
};
