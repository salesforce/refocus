function onEnter(job) {
  const obj = {
    action: 'onEnter',
    cpuUsage: process.cpuUsage(),
    jobId: job.id,
    jobType: job.type,
    memoryUsage: process.memoryUsage(),
    pid: process.pid,
  }
  console.log(JSON.stringify(obj));
}

function beforeExit(job) {
  const obj = {
    action: 'beforeExit',
    cpuUsage: process.cpuUsage(),
    jobId: job.id,
    jobType: job.type,
    memoryUsage: process.memoryUsage(),
    pid: process.pid,
  }
  console.log(JSON.stringify(obj));  
}

module.exports = {
  onEnter,
  beforeExit,
}