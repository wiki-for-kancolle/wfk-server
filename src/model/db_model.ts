import { forEach } from 'lodash';
import { Logger } from 'log4js';
import { db } from './db_pool';

export class DbModel {
    id: number;
    deleted: boolean;
    update_time: string;
    create_time: string;

    fields: string[];
    tableName: string;
    logger?: Logger;

    constructor(data?: any, logger?: Logger, fields?: string[]) {
        this.logger = logger;
        this.fields = fields ?? [];
        this.fields.push('id', 'deleted', 'update_time', 'create_time');
        forEach(this.fields, key => (this[key] = data?.[key] ?? null));
    }

    toObject = (): any => {
        const data = {};
        forEach(this.fields, key => (data[key] = this[key]));
        return data;
    };

    static insert = async (model: DbModel) => {
        const { tableName, logger } = model;
        const data = model.toObject();
        return await db(tableName, logger).insert(data);
    };
}
