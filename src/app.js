import express from "express";
import rateLimit from "express-rate-limit";
import mobileAPI from "./Router/mobileAPI";
import controlAPI from "./Router/controlAPI";
import helmet from "helmet";
import { errorLogHandle, errorClinetHandle } from "./Error/errorHandler";

const app = express();
//----------------- express config
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//----------------- Security
// DDoS attack
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter); // apply to all requests
// HTTP header attack
app.use(helmet());
//----------------- Routes
app.use("/duty", mobileAPI);
app.use("/control", controlAPI);

// heartbeat checking for HAProxy health check 
app.get('/heartbeat', (req, res) => res.status(200).end())
//----------------- Middele
// JWT ?
app.use((req, res, next) => {
    next(); // next(createError(404))
});

//----------------- Error Handle
app.use(errorLogHandle);
app.use(errorClinetHandle);

module.exports = app;