clock: IS_HEROKU=true npm run start-clock
release: IS_HEROKU=true npm run on-release
web: DBEUG=* IS_HEROKU=true npm start
worker: DBEUG=* IS_HEROKU=true node --optimize_for_size --max_old_space_size=12000 worker/jobProcessor.js
