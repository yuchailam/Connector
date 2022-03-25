import dotenv from "dotenv";
import assert from "assert";
import decrypt from "./Plugins/decrypt";
import path from "path"
// load server config file
let dotenvResult = dotenv.config({ path: path.join(__dirname, "/../config/.env-config") });

if (dotenvResult.error) {
    throw dotenvResult.error;
}
let env = dotenvResult.parsed; // {NODE_ENV: 'development', PORT: '8080', HOST: 'localhost'}

assert(env.Node_env, "NODE_ENV is required in .env-config file");
assert(env.Port, "PORT is required in .env-config file");
assert(env.Host, "Host is required in .env-config file");

assert(env.BookOnApi, "BookOnApi is required in .env-config file");
assert(env.BookOffApi, "BookOffApi is required in .env-config file");

assert(env.Rab_user, "Rab_user is required in .env-config file");
assert(env.Rab_password, "Rab_password is required in .env-config file");
assert(env.Rab_exchangeIP, "Rab_exchangeIP is required in .env-config file");

assert(env.logFileName, "logFileName is required in .env-config file");


// get TimeDelay
assert(env.Min_timeDelay, "Min_timeDelay is required in .env-config file");
assert(env.Max_timeDelay, "Max_timeDelay is required in .env-config file");

let min_timeDelay = parseInt(env.Min_timeDelay, 10);
let max_timeDelay = parseInt(env.Max_timeDelay, 10);
assert(max_timeDelay > min_timeDelay, "Max_timeDelay must bigger than Min_timeDelay");

env.base_timeDelay = min_timeDelay;
env.addOn_timeDelay = max_timeDelay - min_timeDelay;

let hotHitRetryInterval = parseInt(env.HotHitRetryInterval, 10);
env.HotHitRetryInterval = !isNaN(hotHitRetryInterval) && hotHitRetryInterval > 0 ? hotHitRetryInterval : 180;

let bookOnOffRetryInterval = parseInt(env.BookOnOffRetryInterval, 10);
env.BookOnOffRetryInterval = !isNaN(bookOnOffRetryInterval) && bookOnOffRetryInterval > 0 ? bookOnOffRetryInterval : 60;

let dbConfig = [];
let MCScoreIP = {};

if (env.MCSHK_active === "true") {
    assert(env.MCSHK_address, "MCSHK_address is required in .env-config file");
    assert(env.MCSHK_database, "MCSHK_database is required in .env-config file");
    assert(env.MCSHK_user, "MCSHK_user is required in .env-config file");
    assert(env.MCSHK_password, "MCSHK_password is required in .env-config file");
    assert(env.MCSHK_coreIP, "MCSHK_coreIP is required in .env-config file");

    dbConfig.push({
        name: "MCSHK",
        server: env.MCSHK_address,
        database: env.MCSHK_database,
        user: env.MCSHK_user,
        password: decrypt(env.MCSHK_password),
    });

    MCScoreIP.MCSHK = env.MCSHK_coreIP;
}

if (env.MCSNT_active === "true") {
    assert(env.MCSNT_address, "MCSNT_address is required in .env-config file");
    assert(env.MCSNT_database, "MCSNT_database is required in .env-config file");
    assert(env.MCSNT_user, "MCSNT_user is required in .env-config file");
    assert(env.MCSNT_password, "MCSNT_password is required in .env-config file");
    assert(env.MCSNT_coreIP, "MCSNT_coreIP is required in .env-config file");

    dbConfig.push({
        name: "MCSNT",
        server: env.MCSNT_address,
        database: env.MCSNT_database,
        user: env.MCSNT_user,
        password: decrypt(env.MCSNT_password),
    });
    MCScoreIP.MCSNT = env.MCSNT_coreIP;
}

if (env.MCSKL_active === "true") {
    assert(env.MCSKL_address, "MCSKL_address is required in .env-config file");
    assert(env.MCSKL_database, "MCSKL_database is required in .env-config file");
    assert(env.MCSKL_user, "MCSKL_user is required in .env-config file");
    assert(env.MCSKL_password, "MCSKL_password is required in .env-config file");
    assert(env.MCSKL_coreIP, "MCSKL_coreIP is required in .env-config file");

    dbConfig.push({
        name: "MCSKL",
        server: env.MCSKL_address,
        database: env.MCSKL_database,
        user: env.MCSKL_user,
        password: decrypt(env.MCSKL_password),
    });
    MCScoreIP.MCSKL = env.MCSKL_coreIP;
}

assert(env.MCS_socket, "MCS_socket is required in .env-config file");
env.MCS_socket = JSON.parse(env.MCS_socket);

env.Port = normalizePort(env.Port || "8080");

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        return val;
    }

    if (port >= 0) {
        return port;
    }
    return false;
}

export { env, dbConfig, MCScoreIP };