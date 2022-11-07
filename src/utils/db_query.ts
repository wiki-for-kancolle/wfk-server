import SqlString from 'sqlstring';
import _ from 'lodash';
import { getLogger, Logger } from 'log4js';
import { Pool, ResultSetHeader } from 'mysql2';
import { DbPool, getDbPool } from './db_pool';

class DbJoin {
    table: string | [string, string];
    condition: string | string[];
    type: 'left' | 'inner' | 'right' | 'full';

    constructor(table: string | [string, string], condition: string | string[], type: 'left' | 'inner' | 'right' | 'full') {
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

enum DbOperation {
    SELECT = 'SELECT',
    INSERT = 'INSERT',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
}

export class DbQuery {
    private _db: DbPool;
    private _logger: Logger;

    private _poolName: string;
    private _operation: DbOperation;
    private _table: string;
    private _tablePrefix: boolean;
    private _alias: string;
    private _join: DbJoin[] = [];
    private _where: DbWhere[] = [];
    private _fields: string[] = [];
    private _limitRows: number = 0;
    private _limitOffset: number = 0;
    private _group: string;
    private _having: string;
    private _order: string;

    private _insertData: any[] = [];
    private _ignoreNull = true;
    private _distinct = false;

    constructor() {}

    /**
     * set table name
     * @param table table name
     * @param prefix if true, table name will be prefixed with the configured prefix
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
    t = this.table;

    /**
     * set pool name, default using the master pool
     * @param pool pool name
     * @returns self
     *
     * @example
     * db('user').use('slave');
     */
    use = (pool: string): DbQuery => {
        this._poolName = pool;
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
     * db('table').join([db('j').field('id, name'), 't2'], 'table.id = t2.id', 'full');
     */
    join = (
        table: string | [string | DbQuery, string],
        condition: string | string[],
        type: 'left' | 'inner' | 'right' | 'full' = 'inner',
    ): DbQuery => {
        if (_.isArray(table)) {
            const [t, alias] = table;
            if (t instanceof DbQuery) this._join.push(new DbJoin(['(' + t.ssql() + ')', alias], condition, type));
            else this._join.push(new DbJoin([t, alias], condition, type));
        } else this._join.push(new DbJoin(table, condition, type));
        return this;
    };
    j = this.join;
    lj = (table: string | [string | DbQuery, string], condition: string | string[]): DbQuery => this.join(table, condition, 'left');
    rj = (table: string | [string | DbQuery, string], condition: string | string[]): DbQuery => this.join(table, condition, 'right');
    fj = (table: string | [string | DbQuery, string], condition: string | string[]): DbQuery => this.join(table, condition, 'full');

    /**
     * avaialble for select / update / delete
     *
     * @param field - field name
     * @param operator - operator
     * @param value - value
     * @returns self
     *
     * @example
     * db('table').where('id = 1').select(); // exp
     * db('table').where('id', 1).select(); // field, value. (operator = '=')
     * db('table').where('id', '>', 1).select(); // field, operator, value
     * db('table').where(['id', '=', 1]).select(); // array(field, operator, value)
     * db('table').where([['id', '=', 1], ['num', '>', '1']]).select(); // array(array(field, operator, value))
     */
    where = (field: any, operator?: any, value?: any): DbQuery => {
        if (_.isArray(field)) {
            if (_.isArray(_.first(field))) _.forEach(field, f => this.where(f[0], f[1], f[2]));
            else this.where(field[0], field[1], field[2]);
        } else if (_.isString(field) && _.isUndefined(operator) && _.isUndefined(value)) {
            this._where.push(new DbWhere({ exp: field }));
        } else {
            if (!_.isUndefined(operator) && _.isUndefined(value)) this.where(field, '=', operator);
            else this._where.push(new DbWhere({ field, operator, value }));
        }
        return this;
    };
    w = this.where;

    /**
     * @example
     * db('table').whereIn('id', [1, 2, 3]).select();
     */
    whereIn = (field: string, values: any[]): DbQuery => this.where(field, 'IN', values);
    win = this.whereIn;

    /**
     * @example
     * db('table').whereNotIn('id', [1, 2, 3]).select();
     */
    whereNotIn = (field: string, values: any[]): DbQuery => this.where(field, 'NOT IN', values);
    wnin = this.whereNotIn;

    /**
     * @example
     * db('table').whereLike('name', 'abc%').select();
     */
    whereLike = (field: string, value: string): DbQuery => this.where(field, 'LIKE', value);
    wlike = this.whereLike;

    /**
     * @example
     * db('table').whereNotLike('name', 'abc%').select();
     */
    whereNotLike = (field: string, value: string): DbQuery => this.where(field, 'NOT LIKE', value);
    wnlike = this.whereNotLike;

    /**
     * @example
     * db('table').whereNull('name').select();
     */
    whereNull = (field: string): DbQuery => this.where(field, 'IS', null);
    wnull = this.whereNull;

    /**
     * @example
     * db('table').whereNotNull('name').select();
     */
    whereNotNull = (field: string): DbQuery => this.where(field, 'IS NOT', null);
    wnnull = this.whereNotNull;

    /**
     * @example
     * db('table').whereBetween('id', [1, 10]).select();
     */
    whereBetween = (field: string, values: any[]): DbQuery => this.where(field, 'BETWEEN', values);
    wbt = this.whereBetween;

    /**
     * @example
     * db('table').whereNotBetween('id', [1, 10]).select();
     */
    whereNotBetween = (field: string, values: any[]): DbQuery => this.where(field, 'NOT BETWEEN', values);
    wnbt = this.whereNotBetween;

    /**
     * avaialble for select
     * @param fields - fields to select
     * @returns self
     *
     * @example
     * db('table').field('id, name').select();
     * db('table').field(['id', 'name']).select();
     */
    field = (fields: string | string[]) => {
        if (_.isString(fields)) fields = _.split(fields, ',');
        _.forEach(fields, f => this._fields.push(f));
        return this;
    };
    f = this.field;

    /**
     * avaialble for select
     * @param rows - rows to select
     * @param offset - offset
     * @returns self
     *
     * @example
     * db('table').limit(10).select();
     * db('table').limit(10, 20).select();
     */
    limit = (rows: number, offset: number = 0) => {
        this._limitRows = rows;
        this._limitOffset = offset;
        return this;
    };
    l = this.limit;

    /**
     * avaialble for select
     * @param page - page number
     * @param size - page size
     * @returns self
     *
     * @example
     * db('table').page(1, 10).select();
     */
    page = (page: number, size: number = 50) => this.limit(size, (page - 1) * size);
    p = this.page;

    /**
     *
     * @returns first row that matches the query
     *
     * @example
     * db('table').find(1);
     * db('table').where('id', 1).find();
     */
    find = async (id?: number): Promise<any> => {
        if (this._limitRows === 0) this.limit(1);
        if (id && id > 0) this.where('id', id);
        const rows = await this.select();
        return _.first(rows);
    };

    /**
     * avaialble for select
     * @param field - field name
     * @returns
     *
     * @example
     * db('table').column('id');
     */
    column = async (field: string): Promise<any[]> => {
        const rows = await this.select();
        return _.map(rows, o => o[field]);
    };
    col = this.column;

    /**
     * avaialble for select
     * @param field - field to count
     * @returns count of rows that matches the query
     *
     * @example
     * db('table').count();
     */
    count = async (field: string = '*'): Promise<number> => {
        const f = SqlString.escapeId(field);
        const result = await this.field(`COUNT(${f}) AS count`).limit(1).select();
        return _.first(result).count;
    };
    c = this.count;

    /**
     * avaialble for select
     * @param field - field name
     * @returns
     *
     * @example
     * db('table').max('id');
     */
    max = async (field: string = '*'): Promise<any> => {
        const f = SqlString.escapeId(field);
        const result = await this.field(`MAX(${f}) AS max`).limit(1).select();
        return _.first(result).max;
    };

    /**
     * avaialble for select
     * @param field - field name
     * @returns
     *
     * @example
     * db('table').min('id');
     */
    min = async (field: string = '*'): Promise<any> => {
        const f = SqlString.escapeId(field);
        const result = await this.field(`MIN(${f}) AS min`).limit(1).select();
        return _.first(result).min;
    };

    /**
     * avaialble for select
     * @param field - field name
     * @returns
     *
     * @example
     * db('table').avg('id');
     */
    avg = async (field: string = '*'): Promise<any> => {
        const f = SqlString.escapeId(field);
        const result = await this.field(`AVG(${f}) AS avg`).limit(1).select();
        return _.first(result).avg;
    };

    /**
     * avaialble for select
     * @param field - field name
     * @returns
     *
     * @example
     * db('table').sum('id');
     */
    sum = async (field: string = '*'): Promise<any> => {
        const f = SqlString.escapeId(field);
        const result = await this.field(`SUM(${f}) AS sum`).limit(1).select();
        return _.first(result).sum;
    };

    /**
     * avaialble for select
     * @param exp
     * @returns self
     *
     * @example
     * db('table').order('id').select();
     * db('table').order('name asc, id desc').select();
     */
    order = (exp: string): DbQuery => {
        this._order = exp;
        return this;
    };
    o = this.order;

    /**
     * avaialble for select
     * @param exp
     * @returns self
     *
     * @example
     * db('test').group('name, age').select();
     */
    group = (exp: string): DbQuery => {
        this._group = exp;
        return this;
    };
    g = this.group;

    /**
     * avaialble for select
     * @param exp
     * @returns self
     *
     * @example
     * db('test').group('name').having('count(1) > 2').select();
     */
    having = (exp: string): DbQuery => {
        this._having = exp;
        return this;
    };
    h = this.having;

    /**
     * avaialble for select
     * @param value
     * @returns
     *
     * @example
     * db('table').distinct().field('name').select();
     */
    distinct = (value: boolean = true): DbQuery => {
        this._distinct = value;
        return this;
    };

    /**
     * avaialble for insert / update
     * @param value
     * @returns
     *
     * @example
     * db('table').ignoreNull(false).insert({name: null});
     */
    ignoreNull = (value: boolean): DbQuery => {
        this._ignoreNull = value;
        return this;
    };

    // TODO:
    inc = async (field: string, value: number = 1) => {};
    dec = async (field: string, value: number = 1) => {};
    exp = async (field: string, value: string) => {};

    /**
     *
     * @param data - data to insert
     * @returns inserted id
     *
     * @example
     * db('table').insert({ name: 'abc' });
     * db('table').insert([{ name: 'abc' }, { name: 'def' }]);
     */
    insert = async (data: any | any[]): Promise<number> => {
        const raw = this.insertSql(data);
        // this._logger.debug(raw);
        if (!this._db) return 0;

        try {
            const result = (await this.query(raw))[0] as ResultSetHeader;
            const insertId = result?.insertId ?? 0;
            // this._logger.debug('insert result: ', result);
            return insertId;
        } catch (e) {
            this._logger.error(raw, e);
            return 0;
        }
    };
    i = this.insert;

    /**
     *
     * @param data - data to insert
     * @returns
     *
     * @example
     * db('table').insertAll([{ name: 'abc' }]);
     */
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
    iall = this.insertAll;

    /**
     *
     * @param data - data to insert
     * @returns raw sql
     */
    insertSql = (data: any | any[]): string => {
        if (_.isArray(data)) _.forEach(data, d => this._insertData.push(d));
        else this._insertData.push(data);
        this._operation = DbOperation.INSERT;
        this.beforeQuery();
        return this.raw();
    };
    isql = this.insertSql;

    /**
     *
     * @returns affected rows
     */
    select = async (): Promise<any[]> => {
        const raw = this.selectSql();
        // this._logger.debug(raw);
        if (!this._db) return [];

        try {
            const result = (await this.query(raw))[0] as any[];
            // this._logger.debug('select result: ', result);
            return result;
        } catch (e) {
            this._logger.error(raw, e);
            return [];
        }
    };
    s = this.select;

    /**
     *
     * @returns raw sql
     */
    selectSql = (): string => {
        this._operation = DbOperation.SELECT;
        this.beforeQuery();
        return this.raw();
    };
    ssql = this.selectSql;

    update = async (data: any) => {};

    // TODO:
    delete = async (data: any) => {};

    private beforeQuery = () => {
        const db = getDbPool(this._poolName);
        if (!db) return;
        this._db = db;
        this._logger = db.logger;
    };

    private query = async (raw: string): Promise<any> => await this._db.pool.promise().execute(raw);

    private raw = (): string => {
        if (!this._db) return '';
        let sql = '';
        if (this._operation === DbOperation.INSERT) {
            sql += ' INSERT INTO ';
            sql += this.rawTable();
            sql += this.rawInsertData();
            // sql += ';';
        } else if (this._operation === DbOperation.SELECT) {
            sql += ' SELECT ';
            if (this._distinct) sql += ' DISTINCT ';
            sql += this.rawFields();
            sql += ' FROM ';
            sql += this.rawTable();
            sql += this.rawJoin();
            sql += this.rawWhere();
            sql += this.rawGroup();
            sql += this.rawOrder();
            sql += this.rawLimit();
        } else if (this._operation === DbOperation.UPDATE) {
            sql += ' UPDATE ';
            sql += this.rawTable();
            sql += this.rawJoin();
            sql += ' SET ';
            sql += this.rawWhere();
        } else if (this._operation === DbOperation.DELETE) {
            sql += ' DELETE FROM ';
            sql += this.rawTable();
            sql += this.rawJoin();
            sql += this.rawWhere();
        }

        return sql;
    };

    private rawTable = (): string => {
        let table = '';
        if (this._tablePrefix) table = this._db.options.prefix + this._table;
        else table = this._table;
        if (this._alias) return SqlString.format(' ?? AS ?? ', [_.trim(table), _.trim(this._alias)]);
        else return SqlString.format(' ?? ', [_.trim(table)]);
    };

    private rawInsertData = (): string => {
        const data = _.first(this._insertData);
        const klist: any = [];
        _.forEach(_.keys(data), k => {
            if (this._ignoreNull && (_.isUndefined(data[k]) || _.isNull(data[k]))) return;
            klist.push(k);
        });
        const kstr = _.join(
            _.map(klist, o => SqlString.escapeId(o, true)),
            ' , ',
        );

        const vlist: any = [];
        _.forEach(this._insertData, d => {
            const l: any = [];
            _.forEach(klist, k => l.push(data[k]));
            const vstr =
                '(' +
                _.join(
                    _.map(l, o => SqlString.format('?', [o])),
                    ' , ',
                ) +
                ')';
            vlist.push(vstr);
        });

        return ` ( ${kstr} ) VALUES ${_.join(vlist, ',')}`;
    };

    private rawFields = (): string => {
        if (this._fields.length === 0) return ' * ';
        const fmap = _.map(this._fields, o => {
            const [f, alias] = o.split(' as ');
            if (f.indexOf('(') > -1) {
                if (alias) return _.trim(f) + SqlString.format(' AS ?? ', [_.trim(alias)]);
                else return _.trim(f);
            }
            if (alias) return SqlString.format(' ?? AS ?? ', [_.trim(f), _.trim(alias)]);
            else return SqlString.format(' ?? ', [_.trim(f)]);
        });
        return ' ' + _.join(fmap, ' , ') + ' ';
    };

    private rawJoin = (): string => {
        let sql = '';
        _.forEach(this._join, j => {
            const { table, condition, type } = j;
            sql += ' ' + _.upperCase(_.trim(type)) + ' JOIN ';
            if (_.isArray(table)) {
                const [t, alias] = table;
                if (_.startsWith(_.trim(t), '(')) sql += _.trim(t) + SqlString.format(' AS ?? ', [_.trim(alias)]);
                else sql += SqlString.format(' ?? AS ?? ', [_.trim(t), _.trim(alias)]);
            } else {
                const [t, alias] = _.split(_.trim(table), ' ');
                sql += SqlString.format(' ?? ', [this._db.options.prefix + _.trim(t)]);
                if (alias) sql += SqlString.format(' AS ?? ', [_.trim(alias)]);
            }
            sql += ' ON ';
            const clist = _.isString(condition) ? _.split(condition, ',') : condition;
            const cmap = _.map(clist, o => {
                const [c1, c2] = _.split(_.trim(o), '=');
                return SqlString.format(' ?? = ?? ', [_.trim(c1), _.trim(c2)]);
            });
            sql += _.join(cmap, ' AND ');
            sql += ' ';
        });
        return sql;
    };

    private rawWhere = (): string => {
        if (this._where.length === 0) return '';
        const wmap = _.map(this._where, w => {
            const { exp, field, operator, value } = w;
            if (exp) return _.trim(exp);
            if (_.upperCase(operator) === 'IN' || _.upperCase(operator) === 'NOT IN') {
                const vmap = _.map(value, v => SqlString.format('?', [v]));
                return SqlString.format(` ?? ${operator} (${_.join(vmap, ',')})`, [_.trim(field)]);
            } else if (_.upperCase(operator) === 'BETWEEN' || _.upperCase(operator) === 'NOT BETWEEN') {
                const vmap = _.map(value, v => SqlString.format('?', [v]));
                return SqlString.format(` ?? ${operator} ${_.join(vmap, ' AND ')}`, [_.trim(field)]);
            }
            return SqlString.format(` ?? ${operator} ? `, [_.trim(field), value]);
        });
        return ' WHERE ' + _.join(wmap, ' AND ');
    };

    private rawGroup = (): string => {
        let sql = '';
        if (this._group && this._group.length > 0) {
            const list = _.split(this._group, ',');
            sql += ' GROUP BY ' + _.map(list, g => SqlString.format(' ?? ', [g])).join(',') + ' ';
            if (this._having && this._having.length > 0) sql += ' HAVING ' + this._having + ' ';
        }
        return sql;
    };

    private rawOrder = (): string => {
        let sql = '';
        if (this._order && this._order.length > 0) {
            const list = _.split(this._order, ',');
            sql +=
                ' ORDER BY ' +
                _.map(list, o => {
                    const [field, sort] = _.split(_.trim(o), ' ');
                    if (_.trim(sort)) {
                        if (_.upperCase(_.trim(sort)) === 'ASC' || _.upperCase(_.trim(sort)) === 'DESC')
                            return SqlString.format(' ?? ', [_.trim(field)]) + _.upperCase(_.trim(sort));
                        else return SqlString.format(' ?? ', [_.trim(o)]) + ' ASC';
                    } else return SqlString.format(' ?? ASC', [_.trim(field)]);
                }).join(',') +
                ' ';
        }
        return sql;
    };

    private rawLimit = (): string => {
        if (this._limitRows > 0) return ` LIMIT ${this._limitOffset}, ${this._limitRows} `;
        return '';
    };
}
