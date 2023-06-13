import express from "express";
import "./db/mongoose.js";
import userRouter from "./routers/user-router.js";
import taskRouter from "./routers/task-router.js";

const app = express();
const port = process.env.PORT || 3000;


app.use(express.json());
app.use("/users", userRouter);
app.use("/tasks", taskRouter);

app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
