import express from "express";
import dbPool from "../Plugins/dbConnect";
import { decodeErrorResponse } from "../Plugins/MCS_encoder";

import sentToMCSBuilder from "../Plugins/sendToMCSBuilder"
import { env, MCScoreIP } from "../loadConfig";
import logger from "../Plugins/logger";

// import config file
import hotHitConfig from "../../config/hotHit-config.json";
import RUM from "../../config/region-userCode-mapping.json";
import TUM from "../../config/traffic-userCode-mapping.json";
import DUM from "../../config/division-userCode-mapping.json";
import RM from "../../config/rankCode-mapping.json";

const router = express.Router();
// next = err handling
router.get("/bookOnStatus", (req, res, next) => {
    let loginID = req.query.loginId;
    if (!loginID)
        return next({
            status: 400,
            message: "Badly formed Book On Status request. loginID is missing",
        });
    return dbPool
        .queryAll(
            `SELECT
      [UserName]
      ,[ClientID]
      ,[UserCode]
      ,[CreateTime]
      ,[LastUpdateTime]
      ,[MsgRefNo]
      ,[Routable]
      ,ad.RankCode
      ,ad.DisplayName
      FROM [MasCoreDBMode1].[dbo].[BookOnSession] b
      inner join [MasCoreDBMode1].[dbo].AddressDirectory ad on ad.Address = b.UserName
      where UserName = '${loginID}'
       `
        )
        .then((result) => {
            let outPut = {};
            let tempData = result.filter((data) => data.numOfRecord > 0);

            if (tempData.length === 0) {
                outPut = { bookedOn: false };
            } else if (tempData.length > 1) {
                return next({
                    status: 500,
                    message: `Error, more than two recoeds stored in existing databases; data : ${JSON.stringify(tempData)}`,
                });
            } else {
                let data = tempData[0].record[0];
                let regionGroup = RUM.find((rum) => rum.userCode.includes(data.UserCode));
                let region = regionGroup ? regionGroup.region : null;

                let rankGroup = RM.find((rm) => rm.rankCode === data.RankCode);
                let rankCode = rankGroup ? rankGroup.displayCode : data.RankCode;

                let officerUID = data.UserName;
                let callSign = data.DisplayName;
                let userCode = data.UserCode;
                let fullCallSign = "";

                if (callSign) {
                    let callSignSplit = callSign.split(" ");
                    callSignSplit[callSignSplit.length - 1] = `${rankCode}${officerUID}`;
                    fullCallSign = callSignSplit.join(" ");
                }

                outPut = {
                    bookedOn: true,
                    officerUID: officerUID,
                    rankCode: rankCode,
                    callsign: fullCallSign,
                    userCode: userCode,
                    region: region,
                    lastUpdateTime: data.LastUpdateTime,
                };
            }
            return res.status(200).json(outPut);
        })
        .catch((err) => next({
            status: 500,
            message: err,
        }));
});

/**
 * {
  "officerUID": "51001",
  "rankCode": "PC",
  "callsign": "MPAT01",
  "stopLocation": "36C Bamboo Grove 80 Kennedy Road WCH 8",
  "division": "WCH", // stopped division
  "database": "PONICS",
  "wantedCode": "suspectIDCard",
  "posting": {
    "postingDutyId": "1920dea9-9a2c-400a-bb85-b2594779b542",
    "postingDutyKey": "PTU",
    "postingGroupId": "89d8c742-b35c-465a-a525-eb85d32eff08",
    "postingGroupKey": "HKI",
    "postingSubGroupId": "80522a09-937d-4eb5-b3f9-8e00850f33b3",
    "postingSubGroupKey": "7"
  }
}
 */
// async function cannot use "throw"
router.post("/notifyHotHit", async (req, res, next) => {
    let { officerUID, rankCode, callsign, stopLocation, database, division, wantedCode, posting } = req.body;
    if (!req.body ||
        Object.keys(req.body).find((key) => !req.body[key]) ||
        !officerUID ||
        !rankCode ||
        !callsign ||
        !division ||
        !stopLocation ||
        !database ||
        !wantedCode ||
        !posting
    )
        return next({
            status: 400,
            message: `Bad notifyHotHit request, some data missing. data: ${JSON.stringify(req.body)}`,
        });
    // check wantedCode
    let codeTemp = hotHitConfig.find((config) => config.wantedCode === wantedCode);

    if (!codeTemp)
        return next({
            status: 400,
            message: "wantedCode not found in MCS, please check the spelling or update hotHit config file in MCS server",
        });
    // get radio ID

    try {
        let result = await dbPool.queryAll(`SELECT [ClientID], [UserCode] FROM [MasCoreDBMode1].[dbo].[BookOnSession] where UserName = '${officerUID}'`);
        let tempData = result.filter((data) => data.numOfRecord > 0);
        if (!tempData.length) {
            return next({
                status: 400,
                message: `The user ${officerUID} haven't booked on, there is no record in MCS databases`,
            });
        } else if (tempData.length > 1) {
            return next({
                message: `Error: more than two ${officerUID} recoeds stored in existing databases; data : ${JSON.stringify(tempData)}`,
            });
        } else {
            let stoppedDivision = DUM.find((dum) => dum.division === division);
            if (!stoppedDivision) {
                return next({
                    message: `Cannot find division ${division} in division-userCode-mapping config, please check the division name`
                })
            }

            let stopped_nodeIP = MCScoreIP[stoppedDivision.hotHitRegion];
            if (!stopped_nodeIP) {
                return next({
                    message: `Cannot find IP address of ${stoppedDivision.hotHitRegion}. The region ${stoppedDivision.hotHitRegion} maybe set to disable in .env-config file, but now received a ${stoppedDivision.hotHitRegion} HotHit request`
                })
            }

            let realData = tempData[0];
            let data = realData.record[0];
            // get the Booked On hotHitRegion IP address and bookOnUserCode
            let bookOnUserCode = data.UserCode

            let radioHex = parseInt(data.ClientID).toString(16);
            let notificationID = `${new Date().getTime()}:${Math.floor(1000 + Math.random() * 8999)}`

            logger.info(`Received POST /duty/notifyHotHit: Created notificationID for tracing: ${notificationID}`)

            let output = codeTemp.CADNotification.map((key) => {
                switch (key) {
                    case "<Rank>":
                        return rankCode;
                    case "<UI>":
                        return officerUID;
                    case "<Callsign>":
                        return callsign;
                    case "<Stop Location>":
                        return stopLocation;
                    default:
                        return key;
                }
            });
            //  start to constuct the sentence

            let oriMsg = {
                subject: codeTemp.title,
                msg: output.join(" "),
            };

            let retryInterval = env.HotHitRetryInterval * 1000;
            let send_promise = []
            let toMCS = new sentToMCSBuilder(
                env.MCS_socket, oriMsg,
                retryInterval, notificationID,
                radioHex, officerUID
            )
            let stoppedUserCode = stoppedDivision.userCode
            // =============== Release 1.6 - RAILDIST MCS Notification Rule Change
            // Check if Traffic alert 
            if (posting.postingDutyKey && posting.postingDutyKey === "Traffic") {
                let region = stoppedDivision.region
                try {
                    let bookedOn_nodeIP = getNodeIPFromTUM(bookOnUserCode)
                    send_promise.push(toMCS.send(bookedOn_nodeIP, bookOnUserCode))
                } catch (error) {
                    return next({ message: error })
                }
                // Notify the booked on divisional controller(RC) of triggering officer

                // Notify the Traffic Divisional Controller (RC) for the Stop Location Region
                // get stopped location 
                let tum = TUM.find((t) => t.region === posting.postingGroupKey)
                if (tum) {
                    send_promise.push(toMCS.send(MCScoreIP[tum.hotHitRegion], tum.trafficUserCode))
                } else {
                    return next({ message: `Cannot find traffic user code of  region : ${region} in traffic-userCode-mapping config, skipped sending.` })
                }
            } else {
                send_promise.push(toMCS.send(stopped_nodeIP, stoppedUserCode))

                if (isSpecialPlace(bookOnUserCode, stoppedUserCode) && stoppedUserCode !== bookOnUserCode) {
                    // Notify the booked on divisional controller(RC) of triggering officer
                    try {
                        let bookedOn_nodeIP = getNodeIPFromDUM(bookOnUserCode)
                        send_promise.push(toMCS.send(bookedOn_nodeIP, bookOnUserCode))
                    } catch (error) {
                        return next({ message: error })
                    }
                }
            }
            // ===============  End of Release 1.6 - RAILDIST MCS Notification Rule Change
            /**
             * promise.all will not handle catch error, all error have to be handled by promise itself 
             */
            return Promise.all(send_promise).then((result) => {
                if (result) {
                    result.forEach((data) => {
                        if (data) {
                            let decodedData = decodeErrorResponse(data);
                            logger.info(`Socket recieved respond: ${decodedData}`);
                        }
                    })
                }
                return res.status(200).json({ message: "Operation Succeeded" })
            })
        }
    } catch (error) {
        return next({
            status: 500,
            message: error,
        });
    }
});

let isSpecialPlace = (bookOnUserCode, stoppedUserCode) => (
    bookOnUserCode === "RTSYRC" ||
    bookOnUserCode === "RKSRRC" ||
    stoppedUserCode === "RTSYRC" ||
    stoppedUserCode === "RKSRRC"
)

let getNodeIPFromDUM = (bookOnUserCode) => {
    let dum = DUM.find((dum) => dum.userCode === bookOnUserCode);
    if (!dum) {
        throw new Error(
            `Cannot find bookOnUserCode ${bookOnUserCode} in division-userCode-mapping config, please check the division name`
        )
    }
    return MCScoreIP[dum.hotHitRegion];
}
let getNodeIPFromTUM = (bookOnUserCode) => {
    let tum = TUM.find((tum) => tum.trafficUserCode === bookOnUserCode);
    if (!tum) {
        throw new Error(
            `Cannot find bookOnUserCode ${bookOnUserCode} in traffic-userCode-mapping config, please check the division name`
        )
    }
    return MCScoreIP[tum.hotHitRegion];
}
router.get("/bookOnResync", (req, res, next) => {
    dbPool
        .queryAll(
            `SELECT
      [UserName]
      ,[UserCode]
      ,[LastUpdateTime]
      ,ad.RankCode
      ,ad.DisplayName
      FROM [MasCoreDBMode1].[dbo].[BookOnSession] b
      inner join [MasCoreDBMode1].[dbo].AddressDirectory ad on ad.Address = b.UserName
       `
        )
        .then((result) => {
            if (!result || result.length < 1) {
                return next({
                    message: `System error cannot read the database table. Data: ${result}`
                });
            }
            let resResult = {
                officers: [],
            };
            result.forEach((data) => {
                data.record.forEach((col) => {
                    let officerUID = col.UserName;
                    let callSign = col.DisplayName;
                    let userCode = col.UserCode;
                    let lastUpdateTime = col.LastUpdateTime;

                    let regionGroup = RUM.find((rum) => rum.userCode.includes(userCode));
                    let region = regionGroup ? regionGroup.region : null;

                    let rankGroup = RM.find((rm) => rm.rankCode === col.RankCode);
                    let rankCode = rankGroup ? rankGroup.displayCode : col.RankCode;

                    let fullCallSign = "";

                    if (callSign) {
                        let callSignSplit = callSign.split(" ");
                        callSignSplit[callSignSplit.length - 1] = `${rankCode}${officerUID}`;
                        fullCallSign = callSignSplit.join(" ");
                    }

                    resResult.officers.push({
                        officerUID: officerUID,
                        rankCode: rankCode,
                        callsign: fullCallSign,
                        userCode: userCode,
                        region: region,
                        lastUpdateTime: lastUpdateTime,
                    });
                });
            });
            return res.status(200).json(resResult);
        })
        .catch((err) => {
            return next({
                status: 500,
                message: err,
            });
        });
});

export default router;

// get
// post
// put
// delete