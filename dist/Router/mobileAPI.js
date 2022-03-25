"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _express = _interopRequireDefault(require("express"));

var _dbConnect = _interopRequireDefault(require("../Plugins/dbConnect"));

var _MCS_encoder = require("../Plugins/MCS_encoder");

var _sendToMCSBuilder = _interopRequireDefault(require("../Plugins/sendToMCSBuilder"));

var _loadConfig = require("../loadConfig");

var _logger = _interopRequireDefault(require("../Plugins/logger"));

var _hotHitConfig = _interopRequireDefault(require("../../config/hotHit-config.json"));

var _regionUserCodeMapping = _interopRequireDefault(require("../../config/region-userCode-mapping.json"));

var _trafficUserCodeMapping = _interopRequireDefault(require("../../config/traffic-userCode-mapping.json"));

var _divisionUserCodeMapping = _interopRequireDefault(require("../../config/division-userCode-mapping.json"));

var _rankCodeMapping = _interopRequireDefault(require("../../config/rankCode-mapping.json"));

// import config file
var router = _express["default"].Router(); // next = err handling


router.get("/bookOnStatus", function (req, res, next) {
  var loginID = req.query.loginId;
  if (!loginID) return next({
    status: 400,
    message: "Badly formed Book On Status request. loginID is missing"
  });
  return _dbConnect["default"].queryAll("SELECT\n      [UserName]\n      ,[ClientID]\n      ,[UserCode]\n      ,[CreateTime]\n      ,[LastUpdateTime]\n      ,[MsgRefNo]\n      ,[Routable]\n      ,ad.RankCode\n      ,ad.DisplayName\n      FROM [MasCoreDBMode1].[dbo].[BookOnSession] b\n      inner join [MasCoreDBMode1].[dbo].AddressDirectory ad on ad.Address = b.UserName\n      where UserName = '".concat(loginID, "'\n       ")).then(function (result) {
    var outPut = {};
    var tempData = result.filter(function (data) {
      return data.numOfRecord > 0;
    });

    if (tempData.length === 0) {
      outPut = {
        bookedOn: false
      };
    } else if (tempData.length > 1) {
      return next({
        status: 500,
        message: "Error, more than two recoeds stored in existing databases; data : ".concat(JSON.stringify(tempData))
      });
    } else {
      var data = tempData[0].record[0];

      var regionGroup = _regionUserCodeMapping["default"].find(function (rum) {
        return rum.userCode.includes(data.UserCode);
      });

      var region = regionGroup ? regionGroup.region : null;

      var rankGroup = _rankCodeMapping["default"].find(function (rm) {
        return rm.rankCode === data.RankCode;
      });

      var rankCode = rankGroup ? rankGroup.displayCode : data.RankCode;
      var officerUID = data.UserName;
      var callSign = data.DisplayName;
      var userCode = data.UserCode;
      var fullCallSign = "";

      if (callSign) {
        var callSignSplit = callSign.split(" ");
        callSignSplit[callSignSplit.length - 1] = "".concat(rankCode).concat(officerUID);
        fullCallSign = callSignSplit.join(" ");
      }

      outPut = {
        bookedOn: true,
        officerUID: officerUID,
        rankCode: rankCode,
        callsign: fullCallSign,
        userCode: userCode,
        region: region,
        lastUpdateTime: data.LastUpdateTime
      };
    }

    return res.status(200).json(outPut);
  })["catch"](function (err) {
    return next({
      status: 500,
      message: err
    });
  });
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

router.post("/notifyHotHit", /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(req, res, next) {
    var _req$body, officerUID, rankCode, callsign, stopLocation, database, division, wantedCode, posting, codeTemp, result, tempData, stoppedDivision, stopped_nodeIP, realData, data, bookOnUserCode, radioHex, notificationID, output, oriMsg, retryInterval, send_promise, toMCS, stoppedUserCode, region, bookedOn_nodeIP, tum, _bookedOn_nodeIP;

    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _req$body = req.body, officerUID = _req$body.officerUID, rankCode = _req$body.rankCode, callsign = _req$body.callsign, stopLocation = _req$body.stopLocation, database = _req$body.database, division = _req$body.division, wantedCode = _req$body.wantedCode, posting = _req$body.posting;

            if (!(!req.body || Object.keys(req.body).find(function (key) {
              return !req.body[key];
            }) || !officerUID || !rankCode || !callsign || !division || !stopLocation || !database || !wantedCode || !posting)) {
              _context.next = 3;
              break;
            }

            return _context.abrupt("return", next({
              status: 400,
              message: "Bad notifyHotHit request, some data missing. data: ".concat(JSON.stringify(req.body))
            }));

          case 3:
            // check wantedCode
            codeTemp = _hotHitConfig["default"].find(function (config) {
              return config.wantedCode === wantedCode;
            });

            if (codeTemp) {
              _context.next = 6;
              break;
            }

            return _context.abrupt("return", next({
              status: 400,
              message: "wantedCode not found in MCS, please check the spelling or update hotHit config file in MCS server"
            }));

          case 6:
            _context.prev = 6;
            _context.next = 9;
            return _dbConnect["default"].queryAll("SELECT [ClientID], [UserCode] FROM [MasCoreDBMode1].[dbo].[BookOnSession] where UserName = '".concat(officerUID, "'"));

          case 9:
            result = _context.sent;
            tempData = result.filter(function (data) {
              return data.numOfRecord > 0;
            });

            if (tempData.length) {
              _context.next = 15;
              break;
            }

            return _context.abrupt("return", next({
              status: 400,
              message: "The user ".concat(officerUID, " haven't booked on, there is no record in MCS databases")
            }));

          case 15:
            if (!(tempData.length > 1)) {
              _context.next = 19;
              break;
            }

            return _context.abrupt("return", next({
              message: "Error: more than two ".concat(officerUID, " recoeds stored in existing databases; data : ").concat(JSON.stringify(tempData))
            }));

          case 19:
            stoppedDivision = _divisionUserCodeMapping["default"].find(function (dum) {
              return dum.division === division;
            });

            if (stoppedDivision) {
              _context.next = 22;
              break;
            }

            return _context.abrupt("return", next({
              message: "Cannot find division ".concat(division, " in division-userCode-mapping config, please check the division name")
            }));

          case 22:
            stopped_nodeIP = _loadConfig.MCScoreIP[stoppedDivision.hotHitRegion];

            if (stopped_nodeIP) {
              _context.next = 25;
              break;
            }

            return _context.abrupt("return", next({
              message: "Cannot find IP address of ".concat(stoppedDivision.hotHitRegion, ". The region ").concat(stoppedDivision.hotHitRegion, " maybe set to disable in .env-config file, but now received a ").concat(stoppedDivision.hotHitRegion, " HotHit request")
            }));

          case 25:
            realData = tempData[0];
            data = realData.record[0]; // get the Booked On hotHitRegion IP address and bookOnUserCode

            bookOnUserCode = data.UserCode;
            radioHex = parseInt(data.ClientID).toString(16);
            notificationID = "".concat(new Date().getTime(), ":").concat(Math.floor(1000 + Math.random() * 8999));

            _logger["default"].info("Received POST /duty/notifyHotHit: Created notificationID for tracing: ".concat(notificationID));

            output = codeTemp.CADNotification.map(function (key) {
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
            }); //  start to constuct the sentence

            oriMsg = {
              subject: codeTemp.title,
              msg: output.join(" ")
            };
            retryInterval = _loadConfig.env.HotHitRetryInterval * 1000;
            send_promise = [];
            toMCS = new _sendToMCSBuilder["default"](_loadConfig.env.MCS_socket, oriMsg, retryInterval, notificationID, radioHex, officerUID);
            stoppedUserCode = stoppedDivision.userCode; // =============== Release 1.6 - RAILDIST MCS Notification Rule Change
            // Check if Traffic alert 

            if (!(posting.postingDutyKey && posting.postingDutyKey === "Traffic")) {
              _context.next = 55;
              break;
            }

            region = stoppedDivision.region;
            _context.prev = 39;
            bookedOn_nodeIP = getNodeIPFromTUM(bookOnUserCode);
            send_promise.push(toMCS.send(bookedOn_nodeIP, bookOnUserCode));
            _context.next = 47;
            break;

          case 44:
            _context.prev = 44;
            _context.t0 = _context["catch"](39);
            return _context.abrupt("return", next({
              message: _context.t0
            }));

          case 47:
            // Notify the booked on divisional controller(RC) of triggering officer
            // Notify the Traffic Divisional Controller (RC) for the Stop Location Region
            // get stopped location 
            tum = _trafficUserCodeMapping["default"].find(function (t) {
              return t.region === posting.postingGroupKey;
            });

            if (!tum) {
              _context.next = 52;
              break;
            }

            send_promise.push(toMCS.send(_loadConfig.MCScoreIP[tum.hotHitRegion], tum.trafficUserCode));
            _context.next = 53;
            break;

          case 52:
            return _context.abrupt("return", next({
              message: "Cannot find traffic user code of  region : ".concat(region, " in traffic-userCode-mapping config, skipped sending.")
            }));

          case 53:
            _context.next = 65;
            break;

          case 55:
            send_promise.push(toMCS.send(stopped_nodeIP, stoppedUserCode));

            if (!(isSpecialPlace(bookOnUserCode, stoppedUserCode) && stoppedUserCode !== bookOnUserCode)) {
              _context.next = 65;
              break;
            }

            _context.prev = 57;
            _bookedOn_nodeIP = getNodeIPFromDUM(bookOnUserCode);
            send_promise.push(toMCS.send(_bookedOn_nodeIP, bookOnUserCode));
            _context.next = 65;
            break;

          case 62:
            _context.prev = 62;
            _context.t1 = _context["catch"](57);
            return _context.abrupt("return", next({
              message: _context.t1
            }));

          case 65:
            return _context.abrupt("return", Promise.all(send_promise).then(function (result) {
              if (result) {
                result.forEach(function (data) {
                  if (data) {
                    var decodedData = (0, _MCS_encoder.decodeErrorResponse)(data);

                    _logger["default"].info("Socket recieved respond: ".concat(decodedData));
                  }
                });
              }

              return res.status(200).json({
                message: "Operation Succeeded"
              });
            }));

          case 66:
            _context.next = 71;
            break;

          case 68:
            _context.prev = 68;
            _context.t2 = _context["catch"](6);
            return _context.abrupt("return", next({
              status: 500,
              message: _context.t2
            }));

          case 71:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[6, 68], [39, 44], [57, 62]]);
  }));

  return function (_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}());

var isSpecialPlace = function isSpecialPlace(bookOnUserCode, stoppedUserCode) {
  return bookOnUserCode === "RTSYRC" || bookOnUserCode === "RKSRRC" || stoppedUserCode === "RTSYRC" || stoppedUserCode === "RKSRRC";
};

var getNodeIPFromDUM = function getNodeIPFromDUM(bookOnUserCode) {
  var dum = _divisionUserCodeMapping["default"].find(function (dum) {
    return dum.userCode === bookOnUserCode;
  });

  if (!dum) {
    throw new Error("Cannot find bookOnUserCode ".concat(bookOnUserCode, " in division-userCode-mapping config, please check the division name"));
  }

  return _loadConfig.MCScoreIP[dum.hotHitRegion];
};

var getNodeIPFromTUM = function getNodeIPFromTUM(bookOnUserCode) {
  var tum = _trafficUserCodeMapping["default"].find(function (tum) {
    return tum.trafficUserCode === bookOnUserCode;
  });

  if (!tum) {
    throw new Error("Cannot find bookOnUserCode ".concat(bookOnUserCode, " in traffic-userCode-mapping config, please check the division name"));
  }

  return _loadConfig.MCScoreIP[tum.hotHitRegion];
};

router.get("/bookOnResync", function (req, res, next) {
  _dbConnect["default"].queryAll("SELECT\n      [UserName]\n      ,[UserCode]\n      ,[LastUpdateTime]\n      ,ad.RankCode\n      ,ad.DisplayName\n      FROM [MasCoreDBMode1].[dbo].[BookOnSession] b\n      inner join [MasCoreDBMode1].[dbo].AddressDirectory ad on ad.Address = b.UserName\n       ").then(function (result) {
    if (!result || result.length < 1) {
      return next({
        message: "System error cannot read the database table. Data: ".concat(result)
      });
    }

    var resResult = {
      officers: []
    };
    result.forEach(function (data) {
      data.record.forEach(function (col) {
        var officerUID = col.UserName;
        var callSign = col.DisplayName;
        var userCode = col.UserCode;
        var lastUpdateTime = col.LastUpdateTime;

        var regionGroup = _regionUserCodeMapping["default"].find(function (rum) {
          return rum.userCode.includes(userCode);
        });

        var region = regionGroup ? regionGroup.region : null;

        var rankGroup = _rankCodeMapping["default"].find(function (rm) {
          return rm.rankCode === col.RankCode;
        });

        var rankCode = rankGroup ? rankGroup.displayCode : col.RankCode;
        var fullCallSign = "";

        if (callSign) {
          var callSignSplit = callSign.split(" ");
          callSignSplit[callSignSplit.length - 1] = "".concat(rankCode).concat(officerUID);
          fullCallSign = callSignSplit.join(" ");
        }

        resResult.officers.push({
          officerUID: officerUID,
          rankCode: rankCode,
          callsign: fullCallSign,
          userCode: userCode,
          region: region,
          lastUpdateTime: lastUpdateTime
        });
      });
    });
    return res.status(200).json(resResult);
  })["catch"](function (err) {
    return next({
      status: 500,
      message: err
    });
  });
});
var _default = router; // get
// post
// put
// delete

exports["default"] = _default;