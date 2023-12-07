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
const logger = require('@salesforce/refocus-logging-client');
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
const ipfilter = require('express-ipfilter').IpFilter;
const rejectMultipleXForwardedFor =
  require('./config/rejectMultipleXForwardedFor');
const bodyParser = require('body-parser');
const env = conf.environment[conf.nodeEnv];
const ENCODING = 'utf8';
const compress = require('compression');
const cors = require('cors');
const etag = require('etag');
const ipAddressUtils = require('./utils/ipAddressUtils');
const ipWhitelistUtils = require('./utils/ipWhitelistUtils');
const debug = require('debug')('app:middleware');

// Add this at the beginning of your Node.js script
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', reason.stack || reason);
  console.log('Unhandled Rejection at:', reason.stack || reason);
  // Handle the rejection...
});

// set up server side socket.io and redis publisher
const express = require('express');
const enforcesSSL = require('express-enforces-ssl');

const app = express();
let serverApp;
const passportModule = require('passport');

try {

  /*
  * Call this *before* the static pages and the API routes so that both the
  * static pages *and* the API responses are compressed (gzip).
  */
  app.use(compress());

  const redis = require('redis');
  const util = require('util');
  const httpServer = require('http').createServer(app);
  const io = require('socket.io')(httpServer);
  const socketIOSetup = require('./realtime/setupSocketIO');

  // modules for authentication
  const cookieParser = require('cookie-parser');
  const session = require('express-session');

  console.log('here before client creation conf.redis.instanceUrl.session', conf.redis.instanceUrl.session);
  console.log('Redis URL:', `redis:${conf.redis.instanceUrl.session}`);
  // Create a standalone Redis client with TLS options
  const redisClient = redis.createClient({
    url: conf.redis.instanceUrl.session,
    tls: {
      rejectUnauthorized: false
    },
    legacyMode: true,
  });

  redisClient.connect().catch(console.error);

  console.log('Redis Client Status:', redisClient.status);

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });
  
  redisClient.on('connect', async() => {
    console.log('\n\n\n\n\\n Redis Client Connected =======>>>>>>>>>>>>>>>>>>>>>>>>>>>');
  });

  console.log('\n\n\n redisClient', redisClient.status);
  const RedisStore = require('connect-redis')(session);
  const rstore = new RedisStore({ client: redisClient });
  console.log('conf.redis.instanceUrl.session', conf.redis.instanceUrl.session);
  socketIOSetup.init(io, rstore);
  (async () => {
    const redisSubscriber = require('./realtime/redisSubscriber');
    
    try {
      await redisSubscriber(io);
      console.log('\n\n redisSubscriber ==>>>>', redisSubscriber);
    } catch (error) {
      console.error('Error:', error);
    }
  })();

  // pass passport for configuration

  console.log('passportModule strategy');
  // middleware for checking api token
  const jwtUtil = require('./utils/jwtUtil');

  // middleware for api rate limits
  const rateLimit = require('./rateLimit');
  console.log('\n\n rateLimit ==>>>', rateLimit);
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

  /*
  * Set req.locals.ipAddress. Make sure this comes *before* the custom
  * rejectMultipleXForwardedFor middleware!
  */

  app.use(ipAddressUtils.middleware);

  console.log('conf ipWhitelistService ==>>>', conf.ipWhitelistService);

  // Reject (401) requests with multiple X-Forwarded-For values
  if (featureToggles.isFeatureEnabled('rejectMultipleXForwardedFor')) {
    app.use(rejectMultipleXForwardedFor);
  }

  // Set the IP restricitions defined in config.js
  if (conf.ipWhitelistService) {
    console.log("\n\n\n conf ipWhitelistService");
    app.use(ipWhitelistUtils.middleware);
  } else {
    console.log("\n\n\n not conf ipWhitelistService", env.ipWhitelist);
    app.use(ipfilter(env.ipWhitelist, { mode: 'allow', log: false }));
  }

  if (isDevelopment) {
    console.log('\n\nis development if cond');
    const webpack = require('webpack');
    const webpackConfig = require('./webpack.config');
    const compiler = webpack(webpackConfig);

    app.use(require('webpack-dev-middleware')(compiler, {
      noInfo: true,
      publicPath: webpackConfig.output.publicPath,
    }));

    app.use(require('webpack-hot-middleware')(compiler));
    serverApp = app.listen(PORT, () => {
      console.log(`Server is running on port development mode ${PORT}`);
      logger.info(listening, PORT);
    });
  } else {
    console.log('\n\nis development else cond');
    serverApp = httpServer.listen(PORT, () => {
      console.log(`Server is running on port non development ${PORT}`);
      logger.info(listening, PORT);
    });
  }

  // View engine setup
  app.set('views', path.join(__dirname, 'view'));
  app.set('view engine', 'pug');

  // Initialize the Swagger middleware
  const swaggerFile = fs // eslint-disable-line no-sync
  .readFileSync(conf.api.swagger.doc, ENCODING);
  const swaggerDoc = yaml.load(swaggerFile);
  // console.log('\n\n swaggerFile', swaggerFile);
  // console.log('\n\n swaggerDoc', swaggerDoc);
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
    /*
    * Custom middleware to add timestamp, request id, and dyno name to the
    * request, for use in logging.
    */
    app.use((req, res, next) => {
      // timestamp
      req.timestamp = Date.now();

      // request id (heroku only)
      if (req.headers && req.headers['x-request-id']) {
        req.request_id = req.headers['x-request-id'];
      }

      // dyno name (heroku only)
      if (process.env.DYNO) {
        req.dyno = process.env.DYNO;
      }

      next();
    });

    const staticOptions = {
      etag: true,
      setHeaders(res, path, stat) {
        res.set('ETag', etag(stat));

        // give me the latest copy unless I already have the latest copy.
        res.set('Cache-Control', 'public, max-age=0');
      },
    };

    console.log('LANDING_PAGE_URL', process.env.LANDING_PAGE_URL);
    app.get('/', (req, res) => {
      console.log('Handling root path request');
      const landingPageUrl = process.env.LANDING_PAGE_URL || '/perspectives';
      console.log('Redirecting to:', landingPageUrl);
      res.redirect(landingPageUrl);
    });

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
          logger.error(`Failed to initialize limiter for ${method} ${paths}`);
          logger.error(err);
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
  app.use(ipAddressUtils.middleware);
  try {
    console.log('conf.redis.instanceUrl.session', conf.redis.instanceUrl.session);
    console.log('rstore \n\n\n\n', rstore);
    console.log('conf.api.sessionSecret', conf.api.sessionSecret);
    app.use(session({
      store: rstore,
      secret: conf.api.sessionSecret,
      resave: false,
      saveUninitialized: false,
    }));
  } catch (error) {
    console.error('Error setting up session middleware:', error);
  }
  app.use(ipAddressUtils.middleware);
  // Initialize passport and use passport for session
  app.use(passportModule.initialize());
  app.use(passportModule.session());
  require('./config/passportconfig')(passportModule);
  console.log('passport module initiation');
  app.use(ipAddressUtils.middleware);

  console.log('\n\n\n app $$$$$$$$$$$$$$$$$$$',app);
  console.log('\n\n passportModule $$$$$$$$$$$$', passportModule);

  // Add this before the loadView module
  app.use((req, res, next) => {
    console.log('Middleware before loadView');
    next();
  });
  // create app routes
  require('./view/loadView').loadView(app, passportModule, '/v1');

  // Add this after the loadView module
  app.use((req, res, next) => {
    console.log('Middleware after loadView');
    next();
  });

  // After loading modules
  app.use((err, req, res, next) => {
    console.error('\n\n\n\n\nerrrrrrrrrrrrrrrrrrrrrr\n\n\n\n\n', err.stack);
    res.status(500).send('Something went wrong!');
  });

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

  app._router.stack.forEach(function(r){
    if (r.route){
      console.log('\n\napp routes !!!!!!!!!!!!!!');
      console.log(r.route)
    }
  })
} catch(err) {
  console.log('issue with loading express modules')
  console.error(err.stack); // Log the stack trace for more details
}
module.exports = { app, serverApp, passportModule };

