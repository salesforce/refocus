/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./express.js
 *
 * Set up the express server.
 */

/* eslint-disable global-require */
/* eslint-disable no-process-env */
const conf = require('./config');
const signal = require('./signal/signal');
const ONE = 1;
const featureToggles = require('feature-toggles');
const helmet = require('helmet');
const swaggerTools = require('swagger-tools');
const errorHandler = require('./api/v1/errorHandler');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const ipfilter = require('express-ipfilter');
const rejectMultipleXForwardedFor =
  require('./config/rejectMultipleXForwardedFor');
const bodyParser = require('body-parser');
const env = conf.environment[conf.nodeEnv];
const ENCODING = 'utf8';
const compress = require('compression');
const cors = require('cors');
const etag = require('etag');

// set up server side socket.io and redis publisher
const express = require('express');
const enforcesSSL = require('express-enforces-ssl');

const app = express();

/*
 * Call this *before* the static pages and the API routes so that both the
 * static pages *and* the API responses are compressed (gzip).
 */
app.use(compress());

const httpServer = require('http').Server(app);
const io = require('socket.io')(httpServer);
const socketIOSetup = require('./realtime/setupSocketIO');

// modules for authentication
const passportModule = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const rstore = new RedisStore({ url: conf.redis.instanceUrl.session });
socketIOSetup.init(io, rstore);
require('./realtime/redisSubscriber')(io);

// pass passport for configuration
require('./config/passportconfig')(passportModule);

// middleware for checking api token
const jwtUtil = require('./utils/jwtUtil');

// middleware for api rate limits
const rateLimit = require('./rateLimit');

// set up httpServer params
const listening = 'Listening on port';
const isDevelopment = (process.env.NODE_ENV === 'development');
const PORT = process.env.PORT || conf.port;
app.set('port', PORT);

/*
 * If http is disabled, if a GET request comes in over http, automatically
 * attempt to do a redirect 301 to https. Reject all other requests (DELETE,
 * PATCH, POST, PUT, etc.) with a 403.
 */
if (featureToggles.isFeatureEnabled('requireHttps')) {
  app.enable('trust proxy');
  app.use(enforcesSSL());
}

// Reject (401) requests with multiple X-Forwarded-For values
if (featureToggles.isFeatureEnabled('rejectMultipleXForwardedFor')) {
  app.use(rejectMultipleXForwardedFor);
}

// Set the IP restricitions defined in config.js
app.use(ipfilter(env.ipWhitelist, { mode: 'allow', log: false }));

if (isDevelopment) {
  const webpack = require('webpack');
  const webpackConfig = require('./webpack.config');
  const compiler = webpack(webpackConfig);

  app.use(require('webpack-dev-middleware')(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath,
  }));

  app.use(require('webpack-hot-middleware')(compiler));

  app.listen(PORT, () => {
    console.log(listening, PORT); // eslint-disable-line no-console
  });
} else {
  httpServer.listen(PORT, () => {
    console.log(listening, PORT); // eslint-disable-line no-console
  });
}

// View engine setup
app.set('views', path.join(__dirname, 'view'));
app.set('view engine', 'pug');

// Initialize the Swagger middleware
const swaggerFile = fs // eslint-disable-line no-sync
.readFileSync(conf.api.swagger.doc, ENCODING);
const swaggerDoc = yaml.safeLoad(swaggerFile);

if (featureToggles.isFeatureEnabled('hideRoutes')) {
  for (let _path in swaggerDoc.paths) {
    if (swaggerDoc.paths.hasOwnProperty(_path)) {
      if (conf.hiddenRoutes.includes(_path.split('/')[ONE])) {
        delete swaggerDoc.paths[_path];
      }
    }
  }
}

swaggerTools.initializeMiddleware(swaggerDoc, (mw) => {
  const staticOptions = {
    etag: true,
    setHeaders(res, path, stat) {
      res.set('ETag', etag(stat));

      // give me the latest copy unless I already have the latest copy.
      res.set('Cache-Control', 'public, max-age=0');
    },
  };

  app.use('/static', express.static(path.join(__dirname, 'public'),
    staticOptions));

  // Set the X-XSS-Protection HTTP header as a basic protection against XSS
  app.use(helmet.xssFilter());

  /*
   * Allow specified routes to be accessed from Javascript outside of Refocus
   * through cross-origin resource sharing
   * e.g. A bot that needs to get current botData from Refocus
   */
  conf.corsRoutes.forEach((rte) => app.use(rte, cors()));

  // Only let me be framed by people of the same origin
  app.use(helmet.frameguard());  // Same-origin by default

  // Remove the X-Powered-By header (which is on by default in Express)
  app.use(helmet.hidePoweredBy());

  // Keep browsers from sniffing mimetypes
  app.use(helmet.noSniff());

  /*
   * NOTE: this is a *temporary* hack which will change once we implement UX
   * designs.
   *
   * Redirect '/' to the application landing page, which is the environment
   * variable `LANDING_PAGE_URL` if it is defined. If it is not defined then
   * use the default perspective (or the first perspective in alphabetical
   * order if no perspective is defined as the default).
   */
  app.get('/', (req, res) =>
    res.redirect(process.env.LANDING_PAGE_URL || '/perspectives'));

  // Set the JSON payload limit.
  app.use(bodyParser.json({ limit: conf.payloadLimit }));

  /*
   * Interpret Swagger resources and attach metadata to request - must be
   * first in swagger-tools middleware chain.
   */
  app.use(mw.swaggerMetadata());

  // Use token security in swagger api routes
  app.use(mw.swaggerSecurity({
    jwt: (req, authOrSecDef, scopes, cb) => {
      jwtUtil.verifyToken(req, cb);
    },
  }));

  /*
   * Set up API rate limits. Note that we are doing this *after* the
   * swaggerSecurity middleware so that jwtUtil.verifyToken will already
   * have been executed so that all of the request headers it adds are
   * available for the express-limiter "lookup".
   * Set the "lookup" attribute to a string or array to do a value lookup on
   * the request object. For example, if we wanted to apply API request
   * limits by user name and IP address, we could set lookup to
   * ['headers.UserName', 'headers.x-forwarded-for'].
   */
  const methods = conf.expressLimiterMethod;
  const paths = conf.expressLimiterPath;
  methods.forEach((method) => {
    method = method.toLowerCase();
    if (paths && paths.length && app[method]) {
      try {
        app[method](paths, rateLimit);
      } catch (err) {
        console.error(`Failed to initialize limiter for ${method} ${paths}`);
        console.error(err);
      }
    }
  });

  // Validate Swagger requests
  app.use(mw.swaggerValidator(conf.api.swagger.validator));

  /*
   * Route validated requests to appropriate controller. Since Swagger Router
   * will actually return a response, it should be as close to the end of your
   * middleware chain as possible.
   */
  app.use(mw.swaggerRouter(conf.api.swagger.router));

  // Serve the Swagger documents and Swagger UI
  app.use(mw.swaggerUi({
    apiDocs: swaggerDoc.basePath + '/api-docs', // API documetation as JSON
    swaggerUi: swaggerDoc.basePath + '/docs', // API documentation as HTML
  }));

  // Handle Errors
  app.use(errorHandler);
});

// Setup for session
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  store: rstore,
  secret: conf.api.sessionSecret,
  resave: false,
  saveUninitialized: false,
}));

// Initialize passport and use passport for session
app.use(passportModule.initialize());
app.use(passportModule.session());

// create app routes
require('./view/loadView').loadView(app, passportModule, '/v1');

if (featureToggles.isFeatureEnabled('enableSigtermEvent')) {
  /*
   After receiving SIGTERM Heroku will give 30 seconds to shutdown cleanly.
   If any processes remain after that time period, Dyno manager will terminate
   them forcefully with SIGKILL logging 'Error R12' to indicate that the
   shutdown process is not behaving correctly.
   Steps:
   - Stop accepting new requests;
   - Handling pending resources;
   - If not receive any SIGKILL a timeout will be applied killing the app
   avoiding zombie process.

   @see more about server.close callback:
   https://nodejs.org/docs/latest-v8.x/api/net.html#net_server_close_callback
  */
  process.on('SIGTERM', () => {
    httpServer.close(() => {
      signal.gracefulShutdown();
      signal.forceShutdownTimeout();
    });
  });
}

module.exports = { app, passportModule };
