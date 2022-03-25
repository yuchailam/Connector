import net from "net";
import logger from "../Plugins/logger";
const util = require("util");
export default class socketCient {
  static send(port, address, message, rawMsg) {
    logger.info(`Start send socket message to ${address}:${port}, with data: ${util.inspect(rawMsg)}`);
    return new Promise((resolve, reject) => {
      let socket = new net.Socket();
      socket.connect(port, address, () => {
        socket.write(message, (err) => {
          if (err) {
            return reject(new Error(`Socket cannot send to ${address}:${port}`));
          }
          logger.info(`Socket message was sent to ${address}:${port} successfully`);
          socket.destroy();
          return resolve();
        });
      });
      socket.on("data", (data) => {
        logger.info(`Receive data from ${address}:${port}, data: ${data}`);
      });
      socket.on("error", (err) => {
        logger.error(`Socket message was sent to ${address}:${port} failed, with err: ${err}`);
        socket.destroy();
        return reject(err);
      });
      //   socket.on("close", () => {
      //     console.log("socket Close");
      //   });
    });
  }
}
