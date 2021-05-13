const mongoose = require('mongoose');
const dotenv = require('dotenv');

// handle errors in synchronous code
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// if using local database
// const DB = process.env.DATABASE_LOCAL;
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => console.log('DB successfully connected!'));
// console.log(process.env);

const port = process.env.port || 3000;

const server = app.listen(port, () => {
  console.log(`App listening on port ${port}...`);
});

// errors in asynchronous code
// NOTE: this is more of a safety net. you should still have error handling closer to where the error actually occurs
// i.e. catch blocks
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);

  // graceful shutting down, close teh server first then process.exit
  // usually u would need a mechanism to restart the system when app crashes for an actual app
  // most hosting platforms have this alr
  server.close(() => {
    process.exit(1);
  });
});
