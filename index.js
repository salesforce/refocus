/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./index.js
 *
 * Main module to start the express server (web process). To just start the
 * web process use "node index.js". To start both the web and the clock process
 * use "heroku local"
 */

/* eslint-disable global-require */
/* eslint-disable no-process-env */

const throng = require('throng');
const DEFAULT_WEB_CONCURRENCY = 1;
const WORKERS = process.env.WEB_CONCURRENCY || DEFAULT_WEB_CONCURRENCY;
const sampleStore = require('./cache/sampleStoreInit');

/**
 * Entry point for each clustered process.
 */
function start() { // eslint-disable-line max-statements
  /*
   * Heroku support suggested we use segfault-handler but it's not available
   * for node 8 yet.
   */

  // const SegfaultHandler = require('segfault-handler');
  // SegfaultHandler.registerHandler('crash.log');

  const featureToggles = require('feature-toggles');
  const conf = require('./config');
  if (conf.newRelicKey) {
    require('newrelic');
  }

  const helmet = require('helmet');
  const swaggerTools = require('swagger-tools');

  const errorHandler = require('./api/v1/errorHandler');
  const path = require('path');
  const fs = require('fs');
  const yaml = require('js-yaml');
  const ipfilter = require('express-ipfilter');
  const bodyParser = require('body-parser');
  const env = conf.environment[conf.nodeEnv];
  const ENCODING = 'utf8';
  const compress = require('compression');
  const cors = require('cors');

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

  /*
   * Based on the change of state of the "enableSampleStore" feature flag
   * populate the data into the cache or dump the data from the cache into the
   * db
   */
  sampleStore.init();

  /*
   * If the clock dyno is NOT enabled, schedule all the scheduled jobs right
   * from here.
   */
  if (!featureToggles.isFeatureEnabled('enableClockProcess')) {
    require('./clock/index'); // eslint-disable-line global-require
  }

  // View engine setup
  app.set('views', path.join(__dirname, 'view'));
  app.set('view engine', 'pug');

  // Initialize the Swagger middleware
  const swaggerFile = fs // eslint-disable-line no-sync
    .readFileSync(conf.api.swagger.doc, ENCODING);
  const swaggerDoc = yaml.safeLoad(swaggerFile);

  // Filter out hidden routes
  if (!featureToggles.isFeatureEnabled('enableRooms')) {
    for (let i = 0; i < conf.hiddenRoutes.length; i++) {
      delete swaggerDoc.paths[conf.hiddenRoutes[i]];
    }
  }

  swaggerTools.initializeMiddleware(swaggerDoc, (mw) => {
    app.use((req, res, next) => { // add timestamp to request
      req.timestamp = Date.now();
      next();
    });

    app.use('/static', express.static(path.join(__dirname, 'public')));

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
     * Redirect '/' to the application landing page, which right now is the
     * default perspective (or the first perspective in alphabetical order if
     * no perspective is defined as the default).
     */
    app.get('/', (req, res) => res.redirect('/perspectives'));

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
  require('./view/loadView')(app, passportModule, '/v1');

  module.exports = { app, passportModule };
}

const isProd = (process.env.NODE_ENV === 'production');
if (isProd) {
  throng(start, {
    workers: WORKERS,
    lifetime: Infinity,
  });
} else {
  start();
}
