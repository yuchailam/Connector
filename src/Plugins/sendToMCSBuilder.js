import socketCient from "./socketCon";
import logger from "./logger";
import { encodeQueryResponse } from "./MCS_encoder";

let sendToMCS_Socket = (ports, nodeAddress, encodedMsg, oriMsg) => socketCient.send(ports[0], nodeAddress, encodedMsg, oriMsg)
    .catch(() => socketCient.send(ports[1], nodeAddress, encodedMsg, oriMsg))

export default class sentToMCSBuilder {
    constructor(ports, oriMsg, retryInterval, notificationID, radioHex, officerUID) {
        this.ports = ports;
        this.oriMsg = oriMsg;
        this.retryInterval = retryInterval;
        this.notificationID = notificationID;
        this.radioHex = radioHex;
        this.officerUID = officerUID;
    }

    async send(nodeAddress, userCode) {
        let encodedMsg = encodeQueryResponse("922", `2:${this.radioHex}:${this.officerUID}:1`, userCode, null, this.oriMsg);

        return sendToMCS_Socket(this.ports, nodeAddress, encodedMsg, this.oriMsg)
            .then(() => logger.info(`NotificationID: ${this.notificationID} \n Message: Operation Succeeded \n NodeAddress : ${nodeAddress} \n OriMsg: ${JSON.stringify(this.oriMsg)}`))
            .catch((err) => {
                let errorCounter = 0
                logger.error(`
                NotificationID: ${this.notificationID} \n
                Error Message: Server error HotHit cannot be sent: ${err}, Start re-try loop in every ${this.retryInterval} seconds until it can be sent \n
                NodeAddress : ${nodeAddress} \n
                OriMsg: ${this.oriMsg}`
                )
                let timeInterval = setInterval(() =>
                    sendToMCS_Socket(this.ports, nodeAddress, encodedMsg, this.oriMsg)
                        .then(() => {
                            logger.info(`NotificationID: ${this.notificationID} \n Message: Operation Succeeded and HotHit re-try loop is terminated`)
                            return clearInterval(timeInterval)
                        })
                        .catch((err) => {
                            errorCounter++
                            logger.error(`
                        NotificationID: ${this.notificationID} \n
                        Error Message: Server error HotHit cannot be sent: ${err}, will try after ${this.retryInterval} seconds \n
                        NodeAddress : ${nodeAddress} \n
                        OriMsg: ${JSON.stringify(this.oriMsg)} \n
                        Count: ${errorCounter}`
                            )
                        })
                    , this.retryInterval);
            });
    }
}

