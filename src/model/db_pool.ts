import mysql, { Pool, PoolOptions } from 'mysql2';
import { getLogger, Logger } from 'log4js';
import { DbQuery } from './db_query';

let __pool: Pool;
let __logger = getLogger('db');

export const dbPoolInit = (env: PoolOptions) => {
    __pool = mysql.createPool(env);
    __pool.on('connection', connection => {
        __logger.info('db connected: ', connection.threadId);
    });
};

export const db = (table: string, logger?: Logger): DbQuery => {
    return new DbQuery(table, __pool, logger);
};
