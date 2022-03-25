import log4js from "log4js"; // for logging file
import bunyan from "bunyan"; // for async logging to console
const path = require("path");

class logger {
    initLogger(logFileName, appender) {
        this.appender = appender;
        this.logFileName = logFileName;
        this.log = null; // file log
        this.clog = null; // console.log
        
        let appenderString = {};
        appenderString[appender] = {
            type: "file",
            filename: path.join(__dirname, `/../../log/${this.logFileName}`),
            maxLogSize: 5242880,
            backups: 1,
            layout: {
                type: 'pattern',
                pattern: '%d{ISO8601_WITH_TZ_OFFSET} %p %c %m%n',
              }
        };
        appenderString["syslog"] = {
            type: "log4js-syslog-appender",
            tag: "mcs-api",
            facility: 5,
            hostname: "localhost",
            layout: {
                type: 'pattern',
                pattern: '%d{ISO8601_WITH_TZ_OFFSET} %p %c %m%n',
              }
        };
        log4js.configure({
            appenders: appenderString,
            categories: {
                default: { appenders: [appender, "syslog"], level: "all" },
            },
            pm2: true,
        });

        this.log = log4js.getLogger(appender);
        this.syslog = log4js.getLogger("syslog");
        this.clog = bunyan.createLogger({ name: `MCS-${appender}` });
    }

    get fileLocation() {
        return path.join(__dirname, `/../../log/${this.logFileName}`);
    }

    info(msg) {
        // info => will log to file and console
        this.clog.info(msg);
        this.log.info(`Info: ${msg}`);
    }
    warn(msg) {
        this.clog.warn(msg);
        this.log.warn(`Warn: ${msg}`);
    }
    error(msg) {
        this.clog.error(msg);
        this.syslog.error(`Error: ${msg}`);
    }
}
export default new logger();

// Logging: error
// - Date & Time
// - Module Name/Function
// - Message