import SqlString from 'sqlstring';
import { keys, forEach, join, map, isNull, isUndefined, isArray, first, isString } from 'lodash';
import { getLogger, Logger } from 'log4js';
import { Pool, ResultSetHeader } from 'mysql2';
import { getDbPool } from './db_pool';

class DbJoin {
    table: string | DbQuery;
    condition: string;
    type: 'left' | 'inner' | 'right' | 'full';

    constructor(table: string | DbQuery, condition: string, type: 'left' | 'inner' | 'right' | 'full') {
        this.table = table;
        this.condition = condition;
        this.type = type;
    }
}

class DbWhere {
    exp?: string;
    field?: string;
    operator?: string;
    value?: any;

    constructor(data?: any) {
        this.exp = data?.exp;
        this.field = data?.field;
        this.operator = data?.operator;
        this.value = data?.value;
    }
}

export class DbQuery {
    // private _pool: Pool;
    private _logger: Logger;

    private _pool: string;
    private _table: string;
    private _tablePrefix: boolean;
    private _alias: string;
    private _fetchSql: boolean = false;
    private _join: DbJoin[] = [];
    private _where: DbWhere[] = [];

    private _insertData: any;
    private _ignoreNull = true;

    private _selectFields: any;

    constructor() {}

    /**
     * set table name
     * @param table table name
     * @param prefix if true, table name will be prefixed with the pool name
     * @returns self
     *
     * @example
     * db().table('t_user', false);
     * db().table('user', true); // will append 't_' automatically
     */
    table = (table: string, prefix: boolean = false): DbQuery => {
        this._table = table;
        this._tablePrefix = prefix;
        return this;
    };

    /**
     * set pool name, default using the master pool
     * @param pool pool name
     * @returns self
     *
     * @example
     * db('user').use('slave');
     */
    use = (pool: string): DbQuery => {
        this._pool = pool;
        return this;
    };

    /**
     * avaialble for select / update / delete
     *
     * @param name - table alias name
     * @returns self
     *
     * @example
     * db('table').alias('t');
     */
    alias = (name: string): DbQuery => {
        this._alias = name;
        return this;
    };
    as = this.alias;

    /**
     * when called, the sql will be returned instead of executed
     * @returns self
     *
     * @example
     * db('table').fetchSql().find();
     */
    fetchSql = (): DbQuery => {
        this._fetchSql = true;
        return this;
    };

    /**
     * avaialble for select / update / delete
     *
     * @param table - table to join
     * @param condition - join condition
     * @param type - join type
     * @returns self
     *
     * @example
     * db('table').join('table2', 'table.id = table2.id');
     * db('table').join('table2 t2', ['table.id = t2.id', 'table.userid = t2.userid'], 'left');
     * db('table').join(['prefix_table2', 't2'], 'table.id = t2.id', 'full');
     */
    join = (
        table: string | [string, string],
        condition: string | string[],
        type: 'left' | 'inner' | 'right' | 'full' = 'inner',
    ): DbQuery => {
        // this._join.push(new DbJoin(table, condition, type));
        return this;
    };
    j = this.join;

    whereRaw = (exp: string): DbQuery => {
        this._where.push(new DbWhere({ exp }));
        return this;
    };
    where = (field: any, operator?: any, value?: any): DbQuery => {
        if (isArray(field)) {
            if (isArray(first(field))) forEach(field, f => this.where(f[0], f[1], f[2]));
            else this.where(field[0], field[1], field[2]);
        } else if (isString(field) && isUndefined(operator) && isUndefined(value)) this.whereRaw(field);
        else {
            if (!isUndefined(operator) && isUndefined(value)) this.where(field, '=', operator);
            else this._where.push(new DbWhere({ field, operator, value }));
        }
        return this;
    };
    whereIn = (field: string, values: any[]): DbQuery => this.where(field, 'in', values);
    whereNotIn = (field: string, values: any[]): DbQuery => this.where(field, 'not in', values);
    whereLike = (field: string, value: string): DbQuery => this.where(field, 'like', value);
    whereNotLike = (field: string, value: string): DbQuery => this.where(field, 'not like', value);
    whereNull = (field: string): DbQuery => this.where(field, 'is', null);
    whereNotNull = (field: string): DbQuery => this.where(field, 'is not', null);
    whereBetween = (field: string, values: any[]): DbQuery => this.where(field, 'between', values);
    whereNotBetween = (field: string, values: any[]): DbQuery => this.where(field, 'not between', values);
    whereTime = (field: string, operator: string, value: string): DbQuery => this.where(field, operator, `time('${value}')`);
    whereBetweenTime = (field: string, values: string[]): DbQuery =>
        this.whereBetween(
            field,
            values.map(v => `time('${v}')`),
        );

    // insert
    // TODO: replace
    insert = async (data: any, replace: boolean = false): Promise<number> => {
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

    insertAll = async (data: any[], replace: boolean = false): Promise<{ success: number[]; failed: any[] }> => {
        const success = [] as number[];
        const failed = [] as any[];
        for (const d of data) {
            const resultId = await this.insert(d, replace);
            if (resultId > 0) success.push(resultId);
            else failed.push(d);
        }
        return { success, failed };
    };

    batchInsert = async (data: any[]) => {};

    inc = async (field: string, value: number = 1) => {};
    dec = async (field: string, value: number = 1) => {};
    exp = async (field: string, value: string) => {};
    update = async (data: any) => {};

    delete = async (data: any) => {};

    field = (fields: string | string[]) => {};
    limit = (limit: number, offset?: number) => {};
    page = (page: number, size?: number) => {};
    select = async () => {};
    find = async () => {};
    column = async () => {};
    value = async () => {};
    // chunk = async () => {};
    union = async () => {};
    count = async () => {};
    max = async () => {};
    min = async () => {};
    avg = async () => {};
    sum = async () => {};

    order = (order: string) => {};
    group = (group: string) => {};
    having = (having: string) => {};

    query = async (): Promise<any> => {
        const raw = this.raw();
        // this._logger.debug(raw);
        const pool = getDbPool(this._pool);
        return await pool?.pool.promise().execute(raw);
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
