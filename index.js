/**
 * ./index.js
 *
 * Main module to start the express server.
 */

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

// set up sever side socket.io and redis publisher
const express = require('express');
const app = express();
const httpServer = require('http').Server(app);
const io = require('socket.io')(httpServer);
const sub = require('./pubsub').sub;
require('./setupRedis.js')(io, sub);

// modules for authentication
const passportModule = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

// pass passport for configuration
require('./passportconfig')(passportModule);

// middleware for checking api token
const jwtUtil = require('./api/v1/helpers/jwtUtil');

// set up httpServer params
const dbSample = require('./db/index').Sample;
const CHECK_TIMEOUT_INTERVAL_MILLIS = 10000; // 10 seconds
const listening = 'Listening on port';
const isDevelopment = (process.env.NODE_ENV === 'development');
const PORT = process.env.PORT || conf.port;
app.set('port', PORT);

// Set the IP restricitions defined in config.js
app.use(ipfilter(env.ipWhitelist, { mode: 'allow', log: false }));

if (isDevelopment) {
  const webpack = require('webpack');
  const webpackConfig = require('./webpack.config');
  const compiler = webpack(webpackConfig);

  app.use(require('webpack-dev-middleware')(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath
  }));

  app.use(require('webpack-hot-middleware')(compiler));

  app.listen(PORT, () => {
    console.log(listening, PORT); // eslint-disable-line no-console
    setInterval(() => dbSample.doTimeout(), CHECK_TIMEOUT_INTERVAL_MILLIS);
  });
} else {
  httpServer.listen(PORT, () => {
    console.log(listening, PORT); // eslint-disable-line no-console
    setInterval(() => dbSample.doTimeout(), CHECK_TIMEOUT_INTERVAL_MILLIS);
  });
}

// View engine setup
app.set('views', path.join(__dirname, 'view'));
app.set('view engine', 'pug');

// set up admin views
//TODO: use regexp on multiple paths, to avoid code duplication
app.get('/subject*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/aspect*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/sample*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Initialize the Swagger middleware
const swaggerFile = fs // eslint-disable-line no-sync
  .readFileSync(conf.api.swagger.doc, ENCODING);
const swaggerDoc = yaml.safeLoad(swaggerFile);
swaggerTools.initializeMiddleware(swaggerDoc, (mw) => {

  app.use(express.static(path.join(__dirname, 'public')));

  // Compress(gzip) all the responses
  app.use(compress());

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
   * Interpret Swagger resources and attach metadata to request - must be first
   * in swagger-tools middleware chain
   */
  app.use(mw.swaggerMetadata());

  // Use token security in swagger api routes
  if (env.useAccessToken === 'true') {
    app.use(mw.swaggerSecurity({
      jwt: (req, authOrSecDef, scopes, cb) => {
        jwtUtil.verifyToken(env.tokenSecret, req, cb);
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
    apiDocs: swaggerDoc.basePath + '/api-docs', // for API documetation as JSON
    swaggerUi: swaggerDoc.basePath + '/docs', // for API documentation as HTML
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
