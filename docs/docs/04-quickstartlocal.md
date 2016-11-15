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

## Setup Production Environment on Localhost
If not already setup, follow Installation instructions to setup Refocus. Execute the following commands to setup production environment and corresponding config variables:

```
export NODE_ENV=production
export DATABASE_URL='postgres://postgres:postgres@localhost:5432/focusdb'
npm start
```

## Usage

> TODO

## How redis is used
On node server startup, two redis clients are instantiated:
The ```publisher``` is called by the sequelize ORM when a subject or sample is inserted/updated/deleted. It publishes a serialized object keyed by the record type (i.e. ```subject``` or ```sample```) and containing the object which was inserted/updated/deleted.
The ```subscriber``` parses the message string into an object then uses socket.io to broadcast the changes out to any connected browser clients.
After installing the server, you can run ```redis-cli``` to issue commands to redis server. Command to show active channels is: ```PUBSUB CHANNELS *```
