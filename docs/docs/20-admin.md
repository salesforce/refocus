---
layout: docs
title: Admin
---

# Refocus Admin Guide

## Configuration

### Request Rate Limiting

Refocus lets you limit the number of requests per user. Once the user reaches the limit for the specified time interval, subsequent requests will get a response with http status code 429 (Too Many Requests).

Configure your limits using the following environment variables:

- `EXPRESS_LIMITER_PATH` - the URI to limit. Can be any valid [express path](http://expressjs.com/en/4x/api.html#path-examples). To specify multiple paths, separate them with commas, e.g. "/v1/aspects,/v1/subjects". Use "*" to limit  all requests
- `EXPRESS_LIMITER_METHOD` - the HTTP method to limit. Can be any valid [express method](http://expressjs.com/en/4x/api.html#app.METHOD). To specify multiple methods, separate them with commas, e.g. "post,put,patch". Use "all" to limit all methods.
- `EXPRESS_LIMITER_LOOKUP` - the value(s) to lookup on the request object. default: 'headers.UserName'. To specify multiple values, separate them with commas, e.g. "headers.UserName,headers.x-forwarded-for".
- `EXPRESS_LIMITER_TOTAL` - the total number of requests allowed by each user in the specified time interval
- `EXPRESS_LIMITER_EXPIRE` - the time interval in milliseconds after which the limits are reset
- `EXPRESS_LIMITER_TOTAL_2` - use this to configure a secondary limiter. Leave blank to only use the primary limiter.
- `EXPRESS_LIMITER_EXPIRE_2` - use this to configure a secondary limiter. Leave blank to only use the primary limiter.

The following headers will then be added to the response:

- `x-ratelimit-limit` - the total number of requests allowed by this user in each time interval
- `x-ratelimit-remaining` - the total number of requests this user can make before the time interval is reset
- `x-ratelimit-reset` - the Unix timestamp of the next time interval reset

For more details on ratelimiter configuration, see the [ratelimiter](https://www.npmjs.com/package/ratelimiter) module.

-----

*Built with love by the Site Reliability Tools team @ Salesforce.*
