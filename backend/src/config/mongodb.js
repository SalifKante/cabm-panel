import mongoose from 'mongoose';

const connectDB = async () => {
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully');
  });

  // mongoose.connection.on('error', (err) => {
  //   console.error(`MongoDB connection error: ${err}`);
  //   process.exit(1);
  // });

  
  await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.MONGODB_DB_NAME}`)
  // console.log(`${process.env.MONGODB_URI}/${process.env.MONGODB_DB_NAME}`);
}

export default connectDB;

