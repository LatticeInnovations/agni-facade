let Queue = require('bull');
const deleteUserDataQueue =  new Queue('userQueue');
const deleteData = require('./deleteData');

deleteUserDataQueue.process(async (job, done)=>{
    await deleteData(job.data);
    done();
});

deleteUserDataQueue.on("completed", (job) => {
    console.info(`completed ${job.id} job`);
});

deleteUserDataQueue.on("failed", async (job) => {
   await deleteData(job.data);
});