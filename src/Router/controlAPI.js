import express from "express";
import logger from "../Plugins/logger";
import { channelStatus } from "../index";

const router = express.Router();

let validateUser = (req, res, next) => {
  let apiLogin = {
    username: "",
    password: ""
  }

  let username = req.body.username;
  let password = req.body.password;

  if (!username || !password) {
    // console.error("No Firebase ID token was passed as a Bearer token in the Authorization header");
    return res.status(401).end("The username or password is missing")
  }

  if (username === apiLogin.username && password === apiLogin.password) {
    //valid user
    return next();
  } else {
    // username or password error
    return res.status(401).end("The username or password is incorrect");
  }
};

// login checking name and password
router.use(validateUser);

router.post("/stopBookOn", (req, res, next) => {
  logger.warn("Received a /stopBookOn post request")

  if (channelStatus.bookOn) {
    process.send({ rmqChannelControl: '/stopBookOn' });
  } else {
    return res.status(400).end("BookOn service has been stopped -- request failed")
  }
  return res.status(200).end()
});

router.post("/stopBookOff", (req, res, next) => {
  logger.warn("Received a /stopBookOff post request")

  if (channelStatus.bookOff) {
    process.send({ rmqChannelControl: '/stopBookOff' });
  } else {
    return res.status(400).end("BookOff service has been stopped -- request failed")
  }

  return res.status(200).end(rmqChannels.bookOff)
});

router.post("/stopUserUpdate", (req, res, next) => {
  logger.warn("Received a /stopUserUpdate post request")

  if (channelStatus.userUpdate) {
    process.send({ rmqChannelControl: '/stopUserUpdate' });

  } else {
    return res.status(400).end("UserUpdate service has been stopped -- request failed")
  }

  return res.status(200).end(rmqChannels.bookOff)
});

router.post("/startBookOn", (req, res, next) => {
  logger.warn("Received a /startBookOn post request")

  if (channelStatus.bookOn) {
    return res.status(400).end("BookOn service has been started -- request failed")
  } else {
    process.send({ rmqChannelControl: '/startBookOn' });
  }

  return res.status(200).end()
});

router.post("/startBookOff", (req, res, next) => {
  logger.warn("Received a /startBookOff post request")

  if (channelStatus.bookOff) {
    return res.status(400).end("BookOff service has been started -- request failed")
  } else {
    process.send({ rmqChannelControl: '/startBookOff' });
  }

  return res.status(200).end()
});

router.post("/startUserUpdate", (req, res, next) => {
  logger.warn("Received a /startBookOff post request")

  if (channelStatus.userUpdate) {
    return res.status(400).end("userUpdate service has been started -- request failed")
  } else {
    process.send({ rmqChannelControl: '/startUserUpdate' });
  }

  return res.status(200).end()
});

export default router;