import { Router } from "express";
import { User } from "../models/user.js";
import { auth } from "../middleware/auth.js";
import {sendCancellationEmail, sendWelcomeEmail} from "../emails/account.js";
import multer from "multer";
import sharp from "sharp";

const userRouter = new Router();

userRouter.post("", async (req, res) => {
  const user = new User(req.body);
  try {
    await user.save();
    sendWelcomeEmail(user.email, user.name);
    const token = await user.generateAuthToken();
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(400).json({ error });
  }
});

userRouter.patch("/me", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["name", "email", "password", "age"];
  const isValidOperation = updates.every((update) => {
    return allowedUpdates.includes(update);
  });

  if (!isValidOperation) {
    res.status(400).json({ error: "Invalid updates." });
    return;
  }

  try {
    const user = req.user;
    updates.forEach((update) => {
      user[update] = req.body[update];
    });
    await user.save();

    if (!user) {
      res.status(404).send();
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json(error);
  }
});

userRouter.get("/me", auth, async (req, res) => {
  res.json({ user: req.user });
});

userRouter.delete("/me", auth, async (req, res) => {
  try {
    await req.user.deleteOne();
    sendCancellationEmail(req.user.email, req.user.name);
    res.status(200).json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error });
  }
});

const upload = multer({
  limits: {
    fileSize: 1_000_000,
  },
  fileFilter(req, file, callback) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      callback(new Error("File must be a picture (jpg, jpeg, png)"));
      return;
    }
    callback(undefined, true);
  },
});

userRouter.post(
  "/me/avatar",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    req.user.avatar = await sharp(req.file.buffer)
      .resize({ width: 250, height: 250 })
      .png()
      .toBuffer();
    await req.user.save();
    res.send();
  },
  (error, req, res, next) => {
    res.status(400).json({ error: error.message });
  }
);

userRouter.delete("/me/avatar", auth, async (req, res) => {
  const user = req.user;
  try {
    user.avatar = undefined;
    await user.save();
    res.send();
  } catch (error) {
    res.status(500).json({ error });
  }
});

userRouter.get("/:id/avatar", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || !user.avatar) {
      throw new Error("User data not found.");
    }

    res.set("Content-Type", "image/png");
    res.send(user.avatar);
  } catch (e) {
    res.status(404).send(e.message);
  }
});

userRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByCredentials(email, password);
    const token = await user.generateAuthToken();
    res.status(200).json({ user, token });
  } catch (error) {
    res.status(400).json({ error });
  }
});

userRouter.post("/logout", auth, async (req, res) => {
  try {
    if (!req.user.tokens) {
      res.json(404).json({ message: "User not logged in." });
      return;
    }

    req.user.tokens = req.user.tokens.filter(
      ({ token }) => token !== req.token
    );
    await req.user.save();

    res.json({ message: "Successfully logged out." });
  } catch (error) {
    res.status(500).send("Something went wrong.");
  }
});

userRouter.post("/logoutAll", auth, async (req, res) => {
  try {
    if (!req.user.tokens) {
      res.json(401).json({ message: "User not logged in." });
      return;
    }

    req.user.tokens = [];
    await req.user.save();
    res.json({ message: "Successfully logged out from all devices." });
  } catch (e) {
    res.status(500).send("Something went wrong.");
  }
});

export default userRouter;
