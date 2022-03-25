"use strict";

import RM from "../../config/rankCode-mapping.json";
import RUM from "../../config/region-userCode-mapping.json";
import UDM from "../../config/userCode-division-mapping.json"

class basicData {
    constructor(data) {
        this.officerUID = data.officerUID;
        this.lastUpdateTime = data.lastUpdateTime;
        this.rankCode = data.rankCode;
        this.callsign = data.callsign;

        this.finalRankCode = this._getRankCode();
        this.finalCallSign = this._getCallsign();
    }
    _getRankCode() {
        let rankGroup = RM.find((rm) => rm.rankCode === this.rankCode);
        return rankGroup ? rankGroup.displayCode : this.rankCode;
    }
    _getCallsign() {
        if (this.callsign) {
            let callSignSplit = this.callsign.split(" ");
            callSignSplit[callSignSplit.length - 1] = `${this.finalRankCode}${this.officerUID}`;
            return callSignSplit.join(" ");
        } else {
            return "";
        }
    }
}

class bookOnData extends basicData {
    constructor(data) {
        super(data);
        this.serverName = data.serverName;
        this.userCode = data.userCode;
    }
    _getRegion() {
        let rum = RUM.find((rum) => rum.userCode.includes(this.userCode))
        return rum ? rum.region : "";
    }
    _getDivision() {
        let udm = UDM.find((udm) => udm.userCode === this.userCode)
        return udm ? udm.division : "";
    }
    getServerName() {
        return this.serverName || "";
    }
    getFinalData() {
        return {
            officerUID: this.officerUID,
            rankCode: this.finalRankCode,
            callsign: this.finalCallSign,
            division: this._getDivision(),
            lastUpdateTime: this.lastUpdateTime,
            userCode: this.userCode,
            region: this._getRegion(),
        };
    }
}

class bookOffData extends basicData {
    constructor(data) {
        super(data);
    }

    getFinalData() {
        return {
            officerUID: this.officerUID,
            rankCode: this.finalRankCode,
            callsign: this.finalCallSign,
            lastUpdateTime: this.lastUpdateTime,
            userCode: "",
            region: "",
        };
    }
}

export { bookOnData, bookOffData };