import { Router } from "express";
import { Task } from "../models/task.js";
import { auth } from "../middleware/auth.js";

const taskRouter = new Router();

// GET /tasks?completed=false
// GET /tasks?limit=10&skip=0
// GET /tasks?sortBy=createdAt_desc
taskRouter.get("", auth, async (req, res) => {
  const { completed, limit, skip, sortBy } = req.query;

  const findQuery = { owner: req.user._id };
  if (completed !== undefined) {
    findQuery.completed = completed === "true";
  }

  const sortByQuery = {};
  if (sortBy !== undefined) {
    const [key, value] = sortBy.split("_");
    if (value === "desc") {
      sortByQuery[key] = -1;
    } else {
      sortByQuery[key] = 1;
    }
  }

  let limitMatch = 10;
  let skipMatch = 0;

  if (limit !== undefined) {
    limitMatch = parseInt(limit);
  }

  if (skip !== undefined) {
    skipMatch = parseInt(skip);
  }

  try {
    const tasks = await Task.find(findQuery)
      .skip(skipMatch)
      .limit(limitMatch)
      .sort(sortByQuery);

    if (!tasks) {
      res.status(404).send();
      return;
    }

    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ error });
  }
});

taskRouter.post("", auth, async (req, res) => {
  const task = new Task({ ...req.body, owner: req.user._id });

  try {
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error });
  }
});

taskRouter.get("/:id", auth, async (req, res) => {
  const _id = req.params.id;

  try {
    const taskFound = await Task.findOne({ _id, owner: req.user._id });
    if (!taskFound) {
      res.status(404).send();
      return;
    }

    res.status(200).json({ task: taskFound });
  } catch (error) {
    res.status(500).json({ error });
  }
});

taskRouter.patch("/:id", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["description", "completed"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );
  if (!isValidOperation) {
    res.status(400).json({ error: "Invalid updates." });
    return;
  }

  try {
    const id = req.params.id;
    const taskUpdated = await Task.findOne({ _id: id, owner: req.user._id });

    if (!taskUpdated) {
      res.status(404).json({ error: "Task to update not found." });
      return;
    }

    updates.forEach((update) => {
      taskUpdated[update] = req.body[update];
    });
    await taskUpdated.save();

    res.status(200).json({ task: taskUpdated });
  } catch (error) {
    res.status(500).json({ error });
  }
});

taskRouter.delete("/:id", auth, async (req, res) => {
  const idOfTaskToDelete = req.params.id;

  try {
    const taskToDelete = await Task.findOneAndDelete({
      _id: idOfTaskToDelete,
      owner: req.user._id,
    });

    if (!taskToDelete) {
      res.status(404).json({ error: "Task to delete not found." });
      return;
    }

    res.json({ task: taskToDelete });
  } catch (error) {
    res.status(500).json(error);
  }
});

export default taskRouter;
