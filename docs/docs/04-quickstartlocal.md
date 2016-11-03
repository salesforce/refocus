---
layout: docs
title: Quick Start Local
---

# QuickStart with Local Deployment
# Installation
1. Install [Node.js](https://nodejs.org/).
1. Install [PostgreSQL](http://www.enterprisedb.com/products-services-training/pgdownload). Be sure to read the "PostgreSQL One Click Installer README" and follow the instructions there to adjust your shared memory as needed.
1. Install [Redis](http://redis.io/download).
1. Clone this git repository.
1. Run `cd refocus`.
1. Create a new branch: ```git checkout -b <your branch name> master```
1. Run `npm install`. This downloads and installs project dependencies and executes the post-install steps. Note: don't run this with sudo! You may get some weird errors later.
1. Install lunchy (`brew install Caskroom/cask/lunchy`). This will help you start redis.
1. Run `lunchy start redis` to start redis.
1. Run `npm start` to start your Node.js server at http://localhost:3000.
1. If you want to unload some of the processing to a background process run `npm run start-clock`. If you intend to deploy this on heroku and have heroku toolbelt installed run `heroku local` to start both the web and the background process.

### Updates
Whenever you pull down a new version of Refocus from the git repository:

1. Run `npm update` to make sure you have all the latest dependencies.
1. Run `npm start` to start your Node.js server at http://localhost:3000.

## Development
- Run `npm run build` and modify the webpack.config.js to take advantage of react hot module reload (react-hmr), for faster front-end development.
- At times the generated pages don't show due to this error in the browser console: `locals[0] does not appear to be a 'module' object with Hot Module replacement API enabled`. This can happen when the NODE_ENV is blank. To fix the issue, set the NODE_ENV to a non-empty value, then run the build again.
- If you want any of the packages to send output to stdout, you can start your server with `DEBUG=* node .` or you can spell out which packages you want to show debug output, e.g. `DEBUG=express*,swagger* node .`.
- Use [nodemon](http://nodemon.io/) to monitor for any changes in your source and automatically restart your server.
- Use Node.js [Debugger](https://nodejs.org/api/debugger.html).
- If you are making changes to the code, check for adherence to style guidelines by running `gulp style`.
- If you are making any changes to the DB schema, create a migration using `node_modules/.bin/sequelize migration:create --name example-name`

## Setup Production Environment on Localhost
If not already setup, follow Installation instructions to setup Refocus. Execute the following commands to setup production environment and corresponding config variables:

```
export NODE_ENV=production
export DATABASE_URL='postgres://postgres:postgres@localhost:5432/focusdb'
npm start
```

### Package Scripts
Execute any of the scripts in the `scripts` section of [`./package.json`](./package.json) by calling `npm run [SCRIPTNAME]`, e.g. `npm run test` or `npm run lint` or `npm run start`.

## Usage

> TODO

## How redis is used
On node server startup, two redis clients are instantiated:
The ```publisher``` is called by the sequelize ORM when a subject or sample is inserted/updated/deleted. It publishes a serialized object keyed by the record type (i.e. ```subject``` or ```sample```) and containing the object which was inserted/updated/deleted.
The ```subscriber``` parses the message string into an object then uses socket.io to broadcast the changes out to any connected browser clients.
After installing the server, you can run ```redis-cli``` to issue commands to redis server. Command to show active channels is: ```PUBSUB CHANNELS *```
