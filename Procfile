clock: IS_HEROKU=true npm run start-clock
release: IS_HEROKU=true npm run on-release
web: IS_HEROKU=true node --optimize_for_size --max_old_space_size=512 --gc_interval=100 index.js
worker: IS_HEROKU=true node --optimize_for_size --max_old_space_size=2048 --expose-gc --trace-gc --gc_interval=100 worker/jobProcessor.js