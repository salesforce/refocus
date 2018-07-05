clock: DEBUG=$DEBUG_CLOCK IS_HEROKU=true npm run start-clock
release: DEBUG=$DEBUG_RELEASE IS_HEROKU=true npm run on-release
web: DEBUG=$DEBUG_WEB IS_HEROKU=true npm start
worker: DEBUG=$DEBUG_WORKER IS_HEROKU=true node --optimize_for_size --max_old_space_size=12000 worker/jobProcessor.js
