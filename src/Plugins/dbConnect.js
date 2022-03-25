import sql from "mssql";
import { EventEmitter } from "events";
class dbPools {
    constructor() {
        this.pools = {};
        this.em = new EventEmitter();
    }
    connect(config) {
        let dbConfig = {
            user: config.user,
            password: config.password,
            server: config.server, // You can use 'localhost\\instance' to connect to named instance
            database: config.database,
            stream: false,
            options: {
                encrypt: false, // Use this if you're on Windows Azure
                enableArithAbort: true,
                trustedConnection: true,
            },
            port: 1433,
        };
        // Name, pool name
        // ======= create Pool
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            if (!Object.prototype.hasOwnProperty.call(this.pools, config.name)) {
                let conPool = new sql.ConnectionPool(dbConfig);
                try {
                    this.pools[config.name] = await conPool.connect();
                    return resolve(this.pools[config.name]);
                } catch (error) {
                    return reject(error);
                }
            } else {
                return reject(new Error(`The pool ( ${config.name} ) already connected, the connection wasn't completed`));
            }
        });
    }
    query(name, queryString) {
        if (Object.prototype.hasOwnProperty.call(this.pools, name)) {
            return this.pools[name].request().query(queryString);
        } else {
            throw new Error(`The pool ( ${name} ) hasn't been created, if you want to create a pool, use connect() `);
        }
    }
    async queryAll(queryString) {
        return Promise.all(
            Object.keys(this.pools).map((name) => {
                return this.pools[name]
                    .request()
                    .query(queryString)
                    .then((result) => {
                        return { name: name, data: result };
                    });
            })
        ).then((result) => {
            return result.map((node) => {
                return {
                    status: "sucess",
                    dbNode: node.name,
                    record: node.data.recordset,
                    numOfRecord: parseInt(node.data.rowsAffected.toString()),
                };
            });
        });
    }
    async closeAll() {
        return Promise.all(
            Object.values(this.pools).map((pool) => {
                return pool.close();
            })
        )
            .then(() => {
                this.pools = null;
                return true;
            })
            .catch((err) => {
                throw err;
            });
    }
}
export default new dbPools();