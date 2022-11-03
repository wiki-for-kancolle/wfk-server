import mysql, { Pool, PoolOptions } from 'mysql2';
import { getLogger, Logger } from 'log4js';
import { DbQuery } from './db_query';
import { isUndefined } from 'lodash';

const __pools: DbPool[] = [];

export class DbPool {
    pool: Pool;
    options: DbOptions;
    logger: Logger;

    constructor(options: DbOptions) {
        const dbname = 'db_' + options.name;
        this.logger = getLogger(dbname);
        this.pool = mysql.createPool(this.toPoolOptions(options));
        this.pool.on('connection', connection => {
            this.logger.info(dbname, ' connected: ', connection.threadId);
        });
        this.options = options;
        this.logger.info(dbname, ' created');
    }

    toPoolOptions = (options: DbOptions): PoolOptions => {
        const poolOptions: PoolOptions = {
            host: options.host,
            port: options.port,
            user: options.user,
            password: options.password,
            database: options.database,
            charset: options.charset,
            connectTimeout: options.connectTimeout,
            waitForConnections: options.waitForConnections,
            connectionLimit: options.connectionLimit,
        };
        return poolOptions;
    };
}

export interface DbOptions extends PoolOptions {
    name?: string;
    prefix?: string;
    master?: boolean;
}

export const dbPoolInit = (env: DbOptions[]) => {
    env.forEach(options => {
        __pools.push(new DbPool(options));
    });
};

export const getDbPool = (name?: string): DbPool | undefined => {
    if (isUndefined(name)) return __pools.find(p => p.options.master);
    return __pools.find(p => p.options.name === name);
};

export const db = (table?: string, pool?: string): DbQuery => {
    let q = new DbQuery();
    if (!isUndefined(table)) q = q.table(table, true);
    if (!isUndefined(pool)) q = q.use(pool);
    return q;
};
