import SqlString from 'sqlstring';
import { keys, forEach, join, map, isNull, isUndefined } from 'lodash';
import { getLogger, Logger } from 'log4js';
import { Pool, ResultSetHeader } from 'mysql2';

export class DbQuery {
    private _pool: Pool;
    private _logger: Logger;
    private _table: string;
    private _alias: string;
    private _ignoreNull = true;
    private _insertData: any;

    constructor(table: string, pool: Pool, ctx?: any) {
        this._table = table;
        this._pool = pool;
        if (ctx) this._logger = ctx.logger;
        else this._logger = getLogger(table);
    }

    alias = (name: string): DbQuery => {
        this._alias = name;
        return this;
    };

    join = (table: string, on: string, type?: string) => {};
    field = (fields: string) => {};
    where = (where: string) => {};
    whereIn = (field: string, values: string[]) => {};
    group = (group: string) => {};
    order = (order: string) => {};
    limit = (limit: number, offset?: number) => {};

    insert = async (data: any): Promise<number> => {
        this._insertData = data;
        try {
            const result = (await this.query())[0] as ResultSetHeader;
            const insertId = result?.insertId ?? 0;
            // this._logger.debug('insert result: ', result);
            return insertId;
        } catch (e) {
            this._logger.error(e);
            return 0;
        }
    };

    insertAll = async (data: any[]): Promise<{ success: number[]; failed: any[] }> => {
        const success = [] as number[];
        const failed = [] as any[];
        for (const d of data) {
            const resultId = await this.insert(d);
            if (resultId > 0) success.push(resultId);
            else failed.push(d);
        }
        return { success, failed };
    };

    update = async (data: any) => {};
    select = async () => {};
    find = async () => {};
    count = async () => {};

    query = async () => {
        const raw = this.raw();
        // this._logger.debug(raw);
        return await this._pool.promise().execute(raw);
    };

    raw = (): string => {
        let sql = '';
        if (this._insertData) {
            const data = this._insertData;
            let klist: any = [];
            let vlist: any = [];
            forEach(keys(data), k => {
                if (this._ignoreNull && (isUndefined(data[k]) || isNull(data[k]))) return;
                klist.push(k);
                vlist.push(data[k]);
            });
            const kstr = join(
                map(klist, o => SqlString.escapeId(o, true)),
                ' , ',
            );
            const vstr = join(
                map(vlist, o => SqlString.format('?', o)),
                ' , ',
            );

            sql = SqlString.format(`INSERT INTO ?? ( ${kstr} )  VALUES  ( ${vstr} ) ;`, [this._table]);
        }
        return sql;
    };
}
