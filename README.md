[![Build Status](https://travis-ci.com/SalesforceEng/Refocus.svg?token=zCxuyQ4aywV15imFpqT7&branch=master)](https://travis-ci.com/SalesforceEng/Refocus) [![StackShare](http://img.shields.io/badge/tech-stack-0690fa.svg?style=flat)](http://stackshare.io/iamigo/refocus) [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/SalesforceEng/Refocus)
# Refocus

Refocus is a platform for visualizing the health and status of systems and/or services under observation. It is *not* a monitoring or alerting tool.

> TODO: We need to flesh out this description to include why you would want to use it, why you would want to integrate it with your existing monitoring tools, etc.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Features](#features)
- [Installation](#installation)
  - [Updates](#updates)
- [Development](#development)
  - [Package Scripts](#package-scripts)
- [Usage](#usage)
- [How redis is used](#how-redis-is-used)
- [Running on Heroku](#running-on-heroku)
  - [Troubleshooting a Heroku deployment](#troubleshooting-a-heroku-deployment)
- [Perspective Debugging](#perspective-debugging)
- [API Documentation](#api-documentation)
- [Securing Refocus](#securing-refocus)
  - [IP Restrictions](#ip-restrictions)
  - [Authentication](#authentication)
  - [Using API Access Tokens](#using-api-access-tokens)
- [Useful Resources](#useful-resources)
- [Contributing](#contributing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Features
- API for everything
- Pluggable lenses
- Self-service
- Easy deployment to Heroku

## Installation
1. Install [Node.js](https://nodejs.org/).
1. Install [PostgreSQL](http://www.enterprisedb.com/products-services-training/pgdownload). Be sure to read the "PostgreSQL One Click Installer README" and follow the instructions there to adjust your shared memory as needed.
1. Install [Redis](http://redis.io/download).
1. Clone this git repository.
1. Run `cd refocus`.
1. Create a new branch: ```git checkout -b <your branch name> master```
1. Run `npm install`. This downloads and installs project dependencies and executes the post-install steps. Note: don't run this with sudo! You may get some weird errors later.
1. Install lunchy (`brew install Caskroom/cask/lunchy`). This will help you start redis.
1. Run `lunchy start redis` to start redis.
1. Run `npm run initdb` to create the refocus postgres database.
1. Run `npm run resetdb` to run all the DDL to create the database tables and columns and indexes and stuff.
1. Run `npm start` or `node .` to start your Node.js server at http://localhost:3000.

### Updates
Whenever you pull down a new version of Refocus from the git repository:

1. Run `npm update` to make sure you have all the latest dependencies.
1. Run `npm run migratedb` to update any database tables and columns and indexes and stuff since the last update.
1. Run `npm run syncdb` (do we really need to do this? it won't hurt, in any case)
1. Run `npm start` or `node .` to start your Node.js server at http://localhost:3000.

## Development
- Run `npm run build` and modify the webpack.config.js to take advantage of react hot module reload (react-hmr), for faster front-end development.
- At times the generated pages don't show due to this error in the browser console: `locals[0] does not appear to be a 'module' object with Hot Module replacement API enabled`. This can happen when the NODE_ENV is blank. To fix the issue, set the NODE_ENV to a non-empty value, then run the build again.
- If you want any of the packages to send output to stdout, you can start your server with `DEBUG=* node .` or you can spell out which packages you want to show debug output, e.g. `DEBUG=express*,swagger* node .`.
- Use [nodemon](http://nodemon.io/) to monitor for any changes in your source and automatically restart your server.
- Use Node.js [Debugger](https://nodejs.org/api/debugger.html).
- If you are making changes to the code, check for adherence to style guidelines by running `gulp style`.
- If you are making any changes to the DB schema, create a migration using `node_modules/.bin/sequelize migration:create --name example-name`

### Package Scripts
Execute any of the scripts in the `scripts` section of [`./package.json`](./package.json) by calling `npm run [SCRIPTNAME]`, e.g. `npm run test` or `npm run lint` or `npm run start`.

## Usage

> TODO

## How redis is used
On node server startup, two redis clients are instantiated:
The ```publisher``` is called by the sequelize ORM when a subject or sample is inserted/updated/deleted. It publishes a serialized object keyed by the record type (i.e. ```subject``` or ```sample```) and containing the object which was inserted/updated/deleted.
The ```subscriber``` parses the message string into an object then uses socket.io to broadcast the changes out to any connected browser clients.
After installing the server, you can run ```redis-cli``` to issue commands to redis server. Command to show active channels is: ```PUBSUB CHANNELS *```

## Running on Heroku
- Setup Heroku account and toolbelt (follow this guide https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction)
- Run ```heroku create``` to create Heroku project
- If you are not in a private space run ```PGSSLMODE=require``` to make all db data go over ssl
- Run ```heroku config:set NODE_ENV=test```
- Run ```heroku addons:create heroku-postgresql:hobby-dev``` to create a dev db
- Run ```git push heroku <your branch>:master``` which will push to Heroku and start up a dyno.
- Run ```heroku open``` and view the app running in Heroku
- Run ```heroku run bash``` then run ```mocha``` to execute the test suite

If you are running on Heroku and you want to use Google Analytics, store your tracking id in a Heroku config variable called `GOOGLE_ANALYTICS_ID`.

### Enable concurrency
If you want to enable concurrency in your app, store the required number of processes in a Heroku config variable called `WEB_CONCURRENCY`. Ref: [Node-concurrency](https://devcenter.heroku.com/articles/node-concurrency)

### Enable audit logs
Audit logs can be enabled using the following Heroku config variables for corresponding object types:
- Variable name for Subjects: ```AUDIT_SUBJECTS``` 
- Variable name for Samples: ```AUDIT_SAMPLES```
- Variable name for Aspects: ```AUDIT_ASPECTS```

Value for above mentioned variables can be one of these: ```DB | API | ALL | NONE```

## Configuring New Relic

### Local Deployment
Add your New Relic license key to an attribute called ```newRelicKey``` in  ```config.js```

### Heroku Deployment
Install the New Relic add-on--it will automatically set the license key in your heroku environment.

### Troubleshooting a Heroku deployment
- Log errors in suspected areas. Use the logging in the error handler
- For errors 'Relation __ does not exist', the db is not set up properly. Try resetting the database. Run ```heroku run bash``` to enter shell script mode, then run ```gulp resetdb```, to reset the db
- Run ```heroku restart```, to restart the app
- Run ```heroku logs --tail``` to see the heroku logs, as they update

## Setup Production Environment on Localhost
If not already setup, follow Installation instructions to setup Refocus. Execute following commands to setup production environment and corresponding config variables:
- Run ```export NODE_ENV=production```
- Run ```export DATABASE_URL='postgres://postgres:postgres@localhost:5432/focusdb'```
- Run ```npm start``` or ```node .```

## Securing Refocus
1. After installation, log in (UI or API) as `admin@refocus.admin` with password `password` and change the password for that account.
1. Create a new user record for yourself with your real email address, and set your profile to the `Admin` profile.
1. If you want to restrict access to specific IP ranges, see [IP Restrictions](#ip-restrictions) below.
1. If you want to use your own single sign-on (SSO) user authentication service, see [Authentication](#authentication) below.
1. Invite other users. Note: by default, only users with the `Admin` profile will be able to invite other users. If you want to let users register themselves as Refocus users, an Admin must set the config parameter `SELF_REGISTRATION_ENABLED` to `true`.

### IP Restrictions
By default, there are no IP restrictions for Refocus access. An admin can configure IP restrictions by adding a config var in Heroku with name ```IP_WHITELIST``` and value array of IP ranges, eg. ```[ [1.2.3.4, 1.2.3.8], [7.6.5.4, 7.6.9.9], [8.8.8.8, 9.9.9.9] ]```. Only the specified IP ranges will be allowed access to Refocus.

### Authentication
#### Local Authentication only. SSO is not enabled.
A user should sign up with Refocus using register page or POST to /v1/register. Once registered, the user can sign in using Local authentication - username/password on Refocus login page.

#### SSO enabled with Local authentication.
##### Non-SSO users
Non-SSO users should authenticate with Refocus as described above using Local Authentication.

##### SSO-Users
If Single Sign On (SSO) is configured in Refocus, SSO users can login using 'SSO Login' button on login page. In case of local authentication with username/password, SSO users will be considered as unregistered user unless they sign up using register page or POST to /v1/register. Once an SSO user is registered with SSO username, the user can sign in using local authentication as well.

### Using API Access Tokens
- A token is required for API calls when Refocus config has `useAccessToken` set to `true`.
- New users should register to get API access token. A user can POST to the `/v1/register` endpoint to generate a token. Save this token for future use.
- Existing users can POST to the `/v1/token` endpoint to retrieve new token.
- To use the token for API access, add a Header with `Key:Authorization` and `Value: "token returned"` to your API call.
- When using [Postman](https://chrome.google.com/webstore/detail/postman/fhbjgbiflinjbdggehcddcbncdddomop?hl=en) to make an API call, set Body to raw and text to JSON.

## Perspective Debugging
If you are troubleshooting realtime event handling in a perspective, add query parameter `debug=REALTIME` to any perspective URL. This turns on console logging in the browser for all the realtime subject and sample events the perspective receives.

## API Documentation
The API is self-documenting based on [`./api/v1/swagger.yaml`](./api/v1/swagger.yaml). Start your server and open `MY_HOST:MY_PORT/v1/docs` for interactive documentation of all the Refocus API endpoints.

## Useful Resources
- Redis [command line interface](http://redis.io/commands)
- [Postman](https://chrome.google.com/webstore/detail/postman-rest-client/fdmmgilgnpjigdojojpjoooidkmcomcm?hl=en) for testing API calls
- Node.js [token-based authentication](https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens)

## Contributing
Guidelines on contributing to Refocus are available [here](docs/Contributing.md).
