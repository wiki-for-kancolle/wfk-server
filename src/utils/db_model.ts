import { forEach } from 'lodash';
import { Logger } from 'log4js';
import { db } from './db_pool';

export class DbModel {
    id: number;
    deleted: boolean;
    update_time: string;
    create_time: string;

    private fields: string[];
    tableName: string;

    constructor(data?: any, fields?: string[]) {
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
        const { tableName } = model;
        const data = model.toObject();
        return await db(tableName).insert(data);
    };

    static insertAll = async (models: DbModel[]) => {
        const { tableName } = models[0];
        const data = models.map(m => m.toObject());
        return await db(tableName).insertAll(data);
    };
}
