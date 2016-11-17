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
const throng = require('throng');
const WORKERS = process.env.WEB_CONCURRENCY || 1;

/**
 * Entry point for each newly clustered process
 */
function start() { // eslint-disable-line max-statements
  const featureToggles = require('feature-toggles');
  const conf = require('./config');

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

  // set up sever side socket.io and redis publisher
  const express = require('express');
  const enforcesSSL = require('express-enforces-ssl');

  const app = express();

  /*
   * Compress(gzip) all the api responses and all the static files.
   * Since this is called before the static pages and the API routes, this will
   * ensure that both the static pages and the API response are compressed.
   */

  app.use(compress());

  const httpServer = require('http').Server(app);

  const io = require('socket.io')(httpServer);
  const socketIOSetup = require('./realtime/setupSocketIO');
  socketIOSetup.setupNamespace(io);
  const sub = require('./pubsub').sub;
  require('./realtime/redisSubscriber')(io, sub);

  // modules for authentication
  const passportModule = require('passport');
  const cookieParser = require('cookie-parser');
  const session = require('express-session');
  const RedisStore = require('connect-redis')(session);

  // pass passport for configuration
  require('./config/passportconfig')(passportModule);

  // middleware for checking api token
  const jwtUtil = require('./utils/jwtUtil');

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
  if (featureToggles.isFeatureEnabled('disableHttp')) {
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

  // if the clock dyno is not enabled run the Sample timeout query here.
  if (!featureToggles.isFeatureEnabled('enableClockDyno')) {
    // require the sample model only if we want to run the timeout query here
    const dbSample = require('./db/index').Sample;
    setInterval(() => dbSample.doTimeout(), env.checkTimeoutIntervalMillis);
  }

  // View engine setup
  app.set('views', path.join(__dirname, 'view'));
  app.set('view engine', 'pug');

  // Initialize the Swagger middleware
  const swaggerFile = fs // eslint-disable-line no-sync
    .readFileSync(conf.api.swagger.doc, ENCODING);
  const swaggerDoc = yaml.safeLoad(swaggerFile);
  swaggerTools.initializeMiddleware(swaggerDoc, (mw) => {
    app.use('/static', express.static(path.join(__dirname, 'public')));

    // Set the X-XSS-Protection HTTP header as a basic protection against XSS
    app.use(helmet.xssFilter());

    // Only let me be framed by people of the same origin
    app.use(helmet.frameguard());  // Same-origin by default

    // Remove the X-Powered-By header (which is on by default in Express)
    app.use(helmet.hidePoweredBy());

    // Keep browsers from sniffing mimetypes
    app.use(helmet.noSniff());

    // Redirect '/' to '/v1'.
    app.get('/', (req, res) => res.redirect('/perspectives'));

    // set json payload limit
    app.use(bodyParser.json(
      { limit: conf.payloadLimit }
    ));

    /*
     * Interpret Swagger resources and attach metadata to request - must be
     * first in swagger-tools middleware chain.
     */
    app.use(mw.swaggerMetadata());

    // Use token security in swagger api routes
    if (env.useAccessToken === 'true' || env.useAccessToken === true) {
      app.use(mw.swaggerSecurity({
        jwt: (req, authOrSecDef, scopes, cb) => {
          jwtUtil.verifyToken(req, cb);
        },
      }));
    }

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
    store: new RedisStore({ url: env.redisUrl }),
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
