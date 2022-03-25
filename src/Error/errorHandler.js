import logger from "../Plugins/logger";

function errString(method, URL, errMsg, stack) {
  return `Method: ${method}; API URL: ${URL}; \nerrMsg: ${errMsg}; \nstack: ${stack}`;
}

const errorLogHandle = (err, req, res, next) => {
  if (err.status === 500) {
    let errLog = errString(req.method, req.originalUrl, err.message, err.stack);
    logger.error(errLog);
  }
  next(err);
};

const errorClinetHandle = (err, req, res, next) =>
  res.status(err.status || 500).json({
    message: [
      {
        code: err.status,
        message: err.message,
      },
    ],
  });


export { errorLogHandle, errorClinetHandle };
