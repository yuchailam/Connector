const UDM = require("../config/userCode-division-mapping.json")

let userCode = "KTDIST"
console.log(UDM.find((udm) => udm.userCode == userCode).division || "")

