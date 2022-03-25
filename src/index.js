import app from "./app";
import log4js from "log4js";
import http from "http";
import logger from "./Plugins/logger";
import { env, dbConfig } from "./loadConfig";
import dbPool from "./Plugins/dbConnect";

import {
    rmqConnect,
    startAllRmqChannels,
    closeChannel,
    startBookOn,
    startBookOff,
    startUserUpdate
} from "./Plugins/rmq_consumer";

import cluster from "cluster";
import os from "os";
import process from "process";

const cpus = os.cpus().length;
logger.initLogger(env.logFileName, env.Node_env); // Must be global variable => let worker can access

var rmqChannels = {};
var channelStatus = {
    bookOn: true,
    bookOff: true,
    userUpdate: true
}
const channelQueueNames = {
    bookOn: "bookOn",
    bookOff: "bookOff",
    userUpdate: "userUpdate",
}

const main = async () => {
    if (cluster.isMaster) {
        logger.info(`========================= MCS server started ========================= `);
        logger.info(`Master ${process.pid} is running`);
        logger.info(`Log file has been created at Path (${logger.fileLocation})`);
        logger.info(`Config file has been loaded { envName: ${env.Node_env}; URL: http://${env.Host}:${env.Port} }`);
        logger.info(`There are ${cpus} threads running`);

        // Signal Events
        //have default handlers on non-Windows platforms that reset the terminal mode before exiting with code 128 + signal number. If one of these signals has a listener installed, its default behavior will be removed (Node.js will no longer exit)
        process.once("SIGINT", () => {
            // await cleanUp();
            logger.error("MCS will be closed, due to SIGINT <Ctrl>+C / pm2 deletion process");
            log4js.shutdown(() => {
                process.exit(0);
            });
        }); //enerated with <Ctrl>+C
        process.once("SIGTERM", (code) => {
            // await cleanUp();
            logger.error("MCS will be closed, due to SIGTERM");
            log4js.shutdown(() => {
                process.exit(0);
            });
        });

        process.once("uncaughtException", (err, origin) => {
            logger.error(`UncaughtException, MCS will be closed: ${err}, ${origin}`);
            log4js.shutdown(() => {
                process.exit(0);
            });
        });

        for (let i = 0; i < cpus; i++) {
            cluster.fork();
        }

        cluster.on("fork", (worker) => {
            worker.on('message', (msg) => {
                if (msg.rmqChannelControl) {
                    eachWorker((worker) => worker.send({ rmqChannel: msg.rmqChannelControl }))
                }
            });
            logger.info(`Worker ${worker.process.pid} is running`)
        });
        cluster.on("exit", (worker) => {
            logger.info(`Worker ${worker.process.pid} just died`);
            cluster.fork(); // fork a new worker
        });


    } else {
        // --------- Database connection await
        const server = http.Server(app);
        const rmqConfig = {
            hostname: env.Rab_exchangeIP,
            username: env.Rab_user,
            password: env.Rab_password,
            heartbeat: 15
        }
        try {
            await connectDB(dbConfig);

            rmqChannels = await rmqConnect(rmqConfig);
            startAllRmqChannels(rmqChannels);

            process.on('message', (msg) => {
                if (msg.rmqChannel) {
                    channelHandler(msg.rmqChannel);
                }
            })

            server.listen(env.Port, env.Host, () => process.nextTick(() => logger.info(`Service is online and running at http://${env.Host}:${env.Port}`)));
        } catch (error) {
            logger.error(error);
            logger.error("MCS-Server is encountering error(s), please shut down MCS service by typing  pm2 delete 0 ");
        }
    }
};

const connectDB = async (dbConfig) => {
    let dbArray = dbConfig.map((dbInfo) => dbPool.connect(dbInfo).then((pool) => pool));
    return Promise.all(dbArray).catch((err) => {
        throw err;
    });
};
const eachWorker = (callback) => {
    for (const id in cluster.workers) {
        return callback(cluster.workers[id]);
    }
    return true;
}
const channelHandler = (action) => {
    switch (action) {
        case '/stopBookOn':
            closeChannel(rmqChannels.bookOn, channelQueueNames.bookOn)
            channelStatus.bookOn = false
            logger.warn("BookOn service has been stopped -- disconnect bookOn queue")
            break;
        case '/stopBookOff':
            closeChannel(rmqChannels.bookOff, channelQueueNames.bookOff)
            channelStatus.bookOff = false
            logger.warn("BookOff service has been stopped -- disconnect BookOff queue")
            break;
        case '/stopUserUpdate':
            closeChannel(rmqChannels.userUpdate, channelQueueNames.userUpdate)
            channelStatus.userUpdate = false
            logger.warn("BookOff service has been stopped -- disconnect BookOff queue")
            break;
        case '/startBookOn':
            startBookOn(rmqChannels.bookOn, channelQueueNames.bookOn)
            channelStatus.bookOn = true
            logger.warn("BookOn service has been started -- listening to bookOn queue")
            break;
        case '/startBookOff':
            startBookOff(rmqChannels.bookOff, channelQueueNames.bookOff)
            channelStatus.bookOff = true
            logger.warn("BookOff service has been started -- listening BookOff queue")
            break;
        case '/startUserUpdate':
            startUserUpdate(rmqChannels.userUpdate, channelQueueNames.userUpdate)
            channelStatus.userUpdate = true
            logger.warn("BookOff service has been started -- listening BookOff queue")
            break;
        default:
            break;
    }
    return;
}

main();

export { rmqChannels, channelStatus, channelQueueNames };

