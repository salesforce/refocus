/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./rateLimit.js
 *
 * Rate limiting setup
 */
const conf = require('./config');
const activityLogUtil = require('./utils/activityLog');
const featureToggles = require('feature-toggles');
const limiterRedisClient = require('./cache/redisCache').client.limiter;
const Limiter = require('ratelimiter');
const Promise = require('bluebird');
Limiter.prototype.getAsync = Promise.promisify(Limiter.prototype.get);

module.exports = function (req, res, next) {
  if (req.headers.IsAdmin) return next();
  const limiterConfig1 = {
    db: limiterRedisClient,
    max: conf.expressLimiterTotal,
    duration: conf.expressLimiterExpire,
  };
  const limiterConfig2 = {
    db: limiterRedisClient,
    max: conf.expressLimiterTotal2,
    duration: conf.expressLimiterExpire2,
  };

  const lookupVals = [];
  const lookups = conf.expressLimiterLookup;
  lookups.forEach((lookupPath) => {
    const lookupArr = lookupPath.split('.');
    const lookupVal = lookupArr.reduce((prev, cur) => prev ? prev[cur] : null, req);
    if (lookupVal) lookupVals.push(lookupVal);
  });

  const id = lookupVals.join('_');
  if (id) {
    limiterConfig1.id = `1__${id}`;
    limiterConfig2.id = `2__${id}`;
  }

  // The order matters. The second one overwrites the limit headers.
  Promise.resolve()
  .then(() => applyLimits(limiterConfig2))
  .then(() => applyLimits(limiterConfig1))
  .then(next)
  .catch(next);

  function applyLimits(config) {
    if (!config.max || !config.duration || !config.id) {
      return Promise.resolve();
    } else {
      return new Limiter(config).getAsync()
      .then((limit) => {
        res.set('X-RateLimit-Limit', limit.total);
        res.set('X-RateLimit-Remaining', limit.remaining - 1);
        res.set('X-RateLimit-Reset', limit.reset);

        if (limit.remaining === 0) {
          res.set('X-RateLimit-Remaining', 0);
          var after = limit.reset - (Date.now() / 1000) | 0;
          res.set('Retry-After', after);

          if (req && featureToggles.isFeatureEnabled('enableLimiterActivityLogs')) {
            const logObject = {
              activity: 'limiter',
              ipAddress: activityLogUtil.getIPAddrFromReq(req),
              limit: `${config.max}/${config.duration}`,
              method: req.method,
              requestBytes: JSON.stringify(req.body).length,
              responseBytes: 0,
              token: req.headers.TokenName,
              totalTime: `${Date.now() - req.timestamp}ms`,
              uri: req.url,
              user: req.headers.UserName,
            };

            // Add "request_id" if header is set by heroku.
            if (req.headers && req.headers['x-request-id']) {
              logObject.request_id = req.headers['x-request-id'];
            }

            activityLogUtil.printActivityLogString(logObject, 'limiter');
          }

          res.status(429).end();
          return Promise.reject();
        }
      });
    }
  }
};
