import { Queue } from 'bullmq';

const queue = new Queue('file_processing', {
  connection: {
    host: 'localhost',
    port: 6379,
  }
});

export default queue;