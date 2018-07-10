---
layout: docs
title: Quick Start Heroku
---

# Get up and running in seconds on Heroku.
[<img src="https://www.herokucdn.com/deploy/button.svg">](https://heroku.com/deploy?template=https://github.com/Salesforce/refocus)

## Running on Heroku
For the default setup you can click the heroku button to get Refocus running! If you want more control over your deployment than follow the steps below.
- Setup Heroku account and toolbelt (follow this guide https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction)
- Run ```heroku create``` to create Heroku project
- If you are not in a private space run ```PGSSLMODE=require``` to make all db data go over ssl
- Run ```heroku config:set NODE_ENV=test```
- Run ```heroku addons:create heroku-postgresql:hobby-dev``` to create a dev db
- Run ```git push heroku <your branch>:master``` which will push to Heroku and start up a dyno.
- Run ```heroku open``` and view the app running in Heroku
- Run ```heroku run bash``` then run ```mocha``` to execute the test suite
- If you are running the app in more than one dyno, you will need to force the client to communicate with the server only using websockets. To do so, set the config variable `SOCKETIO_TRANSPORT_PROTOCOL` to `websocket` (or if you prefer to use the command line, run ```heroku config:set SOCKETIO_TRANSPORT_PROTOCOL=websocket```).
- If you are running on Heroku and you want to use Google Analytics, store your tracking id in a Heroku config variable called `GOOGLE_ANALYTICS_ID`.
- Set these environment variables to turn on debug for each process type, for any modules which use https://www.npmjs.com/package/debug: `DEBUG_CLOCK`, `DEBUG_RELEASE`, `DEBUG_WEB`, `DEBUG_WORKER`. (The `*` character may be used as a wildcard.)

### Troubleshooting a Heroku deployment
- Log errors in suspected areas. Use the logging in the error handler
- Run ```heroku restart```, to restart the app
- Run ```heroku logs --tail``` to see the heroku logs as they update
