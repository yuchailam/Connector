const util = require("util");
const amqp = require("amqplib/callback_api");
const axios = require("axios");
const xmlParser = require("fast-xml-parser");
const he = require('he');

import logger from "./logger";
import { env } from "../loadConfig";
import { channelQueueNames } from "../index"
import { bookOnData, bookOffData } from "./data_rephrase";

const xmpOptions = {
    tagValueProcessor: (val, tagName) => he.decode(val), //default is a=>a
}

// port 5672
const rmqConnect = (config) => new Promise((resolve, reject) => {
    amqp.connect(config, (err0, connection) => {
        if (err0) {
            logger.info("RabbitMQ Connection Error, system will try next re-connection in 30 sconds")
            return setTimeout(() => rmqConnect(config), 30000)
        }

        logger.info("RabbitMQ connected")

        connection.on('close', () => {
            logger.error("RabbitMQ is closed, system will try next re-connection in 30 sconds");
            return setTimeout(() => rmqConnect(config), 30000)
        })
        connection.on('error', (err) => {
            logger.error("RabbitMQ" + err.message);
        })

        var bookOnQueue = new Promise((resolve, reject) =>
            connection.createChannel((err1, channel) => {
                if (err1) return reject(err1);
                return resolve(channel)
            })
        )

        var bookOffQueue = new Promise((resolve, reject) =>
            connection.createChannel((err1, channel) => {
                if (err1) return reject(err1);
                return resolve(channel)
            })
        )

        var userUpdateQueue = new Promise((resolve, reject) =>
            connection.createChannel((err1, channel) => {
                if (err1) return reject(err1);
                return resolve(channel)
            })
        )

        return Promise.all([bookOnQueue, bookOffQueue, userUpdateQueue]).then((result) => {
            let channels = {
                bookOn: result[0],
                bookOff: result[1],
                userUpdate: result[2]
            }
            return resolve(channels)
        }).catch(err => reject(err));
    });
});

const sendData = (url, data) =>
    axios.post(url, data, {
        headers: {
            "content-type": "application/json",
        },
    });

const sendBookOn = (bookOnData) => {
    let bookOnUrl = env.BookOnApi;
    let userID = bookOnData.officers[0].officerUID;
    logger.info(`Sending BookOn message to ${bookOnUrl} wtih data:  ${util.inspect(bookOnData)}`);
    return sendData(bookOnUrl, bookOnData)
        .then(() => logger.info(`the user ${userID} bookOn has been sent`))
        .catch((error) => sendDataErrorHander(error, userID, bookOnUrl, bookOnData, "BookOn"));
};

const sendBookOff = (bookOffData) => {
    let bookOffUrl = env.BookOffApi;
    logger.info(`Send BookOff message to ${bookOffUrl} wtih data:  ${util.inspect(bookOffData)}`);
    return sendData(bookOffUrl, bookOffData)
        .then(() => logger.info("bookOff has been sent"))
        .catch((error) => sendDataErrorHander(error, "", bookOffUrl, bookOffData, "BookOff"));
};

const sendDataErrorHander = (error, userID, URL, data, actionName) => {
    if (error.response && error.response.status) {
        logger.error(`${actionName} response: ` + error);
        let errCode = error.response.status;
        if (errCode === 400) {
            return logger.error(`${actionName} resonse data: ` + util.inspect(error.response.data));
        } else if (errCode >= 500 && errCode <= 504) {
            return retrySendData(userID, URL, data, actionName)
        } else {
            return logger.error(`${actionName} response data: ` + error.response.data);
        }
    } else if (error.request) {
        // No response – Network Error
        logger.error(`${actionName} request (No response – Network Error): ` + error);
        return retrySendData(userID, URL, data, actionName)
    } else {
        return logger.error(`${actionName} error code: ${error.code} \n error message: ${error.message}`)
    }
}

const retrySendData = (userID, URL, data, actionName) => {
    let extraDelay = getTimeDelay();
    let time = env.BookOnOffRetryInterval * 1000 + extraDelay;
    logger.info(
        `System now re-send the ${userID} ${actionName} request to ${URL} in ${env.BookOnOffRetryInterval} seconds + ${extraDelay} ms delay`
    );
    let timeInterval = setInterval(() => {
        sendData(URL, data)
            .then(() => {
                logger.info(`The ${userID} ${actionName} request has been sent & stop re-send`);
                return clearInterval(timeInterval);
            })
            .catch((err) =>
                logger.error(
                    `System now re-send the ${userID} ${actionName} request to ${URL} in ${env.BookOnOffRetryInterval} seconds + ${extraDelay} ms delay \nError message: ${err}`
                )
            );
    }, time);
}

const getTimeDelay = () => env.base_timeDelay + Math.floor(Math.random() * Math.floor(env.addOn_timeDelay));

const closeChannel = (channel, channelName) => {
    channel.cancel(channelName, (err, ok) => {
        if (err) logger.error(`${channelName} close channel : ${err}`)
        if (ok) logger.info(`${channelName} close channel : Succeeded`)
    })
}

const startBookOn = (channel, queue) => {
    // var queue = "bookOn";
    channel.assertQueue(queue, { durable: true });
    channel.consume(queue, async (msg) => {
        try {
            var jsonData = xmlParser.parse(msg.content.toString(), xmpOptions);
            if (!jsonData) {
                logger.info("Received 'Null' BookOn message from MCS database");
                return channel.ack(msg);
            }
            if (jsonData.bookOn) {
                let finalData = Array.isArray(jsonData.bookOn) ? jsonData.bookOn : [jsonData.bookOn];
                await sendBookOn({ officers: finalData.map((data) => new bookOnData(data).getFinalData()) });
            }
        } catch (error) {
            logger.error(error);
        }
        return channel.ack(msg);
    }, { noAck: false, consumerTag: queue }
    );
}
const startBookOff = (channel, queue) => {
    // let queue = "bookOff";
    let dataBlockSize = 100; // max data in array in each packet
    channel.assertQueue(queue, { durable: true });
    channel.consume(queue, async (msg) => {
        var jsonData = xmlParser.parse(msg.content.toString(), xmpOptions);
        if (!jsonData) {
            logger.info("Received 'Null' BookOff message from MCS database, reason maybe triggered twice resync function, nothing is happened");
            return channel.ack(msg);
        }

        if (!jsonData.bookOff) {
            logger.info("Book Off has been completed, the BookOff event was triggered before");
            return channel.ack(msg);
        }

        let finalData = Array.isArray(jsonData.bookOff) ? jsonData.bookOff : [jsonData.bookOff];
        let blockSize = finalData.length / dataBlockSize

        if (blockSize > 1) {
            let promiseTask = []
            for (let i = 0; i < blockSize; i++) {
                let startIndex = i * dataBlockSize;
                let dataBlock = finalData.slice(startIndex, startIndex + dataBlockSize)
                promiseTask.push(sendBookOff({ officers: dataBlock.map((data) => new bookOffData(data).getFinalData()) }))
            }
            await Promise.all(promiseTask)
        } else {
            await sendBookOff({ officers: finalData.map((data) => new bookOffData(data).getFinalData()) });
        }
        return channel.ack(msg);
    }, { noAck: false, consumerTag: queue }
    );
}

const startUserUpdate = (channel, queue) => {
    // var queue = "userUpdate";
    channel.assertQueue(queue, { durable: true });
    channel.consume(queue, async (msg) => {
        var jsonData = xmlParser.parse(msg.content.toString(), xmpOptions);
        if (!jsonData) {
            logger.info("Received 'Null' userUpdate message from MCS database, nothing is updated");
            return channel.ack(msg);
        }
        let updateData = jsonData.userUpdate;
        logger.info("Received 'userUpdate' from MCS database: " + util.inspect(updateData));
        // -------------Handle BookOff data
        let oldUserData = {
            officerUID: updateData.officerUID,
            rankCode: updateData.oldRankCode,
            callsign: updateData.oldCallsign,
            lastUpdateTime: updateData.lastUpdateTime,
        };
        await sendBookOff({ officers: [new bookOffData(oldUserData).getFinalData()] });
        logger.info(`userUpdate -> officerUID: ${updateData.officerUID} has been booked off`);
        await sendBookOn({ officers: [new bookOnData(updateData).getFinalData()] });
        logger.info(`userUpdate -> officerUID: ${updateData.officerUID} has been booked on`);
        return channel.ack(msg);
    }, { noAck: false, consumerTag: queue }
    );
}

const startAllRmqChannels = (channels) => {
    startBookOn(channels.bookOn, channelQueueNames.bookOn)
    startBookOff(channels.bookOff, channelQueueNames.bookOff)
    startUserUpdate(channels.userUpdate, channelQueueNames.userUpdate)
}
export { rmqConnect, closeChannel, startBookOn, startBookOff, startUserUpdate, startAllRmqChannels };