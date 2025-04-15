import mongoose from "mongoose";

mongoose
  .set("strictQuery", true)
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to database"))
  .catch((err) => console.log(err.message || err));
