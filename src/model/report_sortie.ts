import _ from 'lodash';
import { db } from './db_pool';
import { DbModel } from './db_model';
import { Logger } from 'log4js';

export class ReportSortieModel implements DbModel {
    static tableName = 'wfk_report_sortie';
    ctx: any;
    id: number;
    map_id: number;
    map_area_id: number;
    map_level: number;
    teitoku_id: string;
    nick_name: string;
    info: string;
    info_length: number;
    deleted: boolean;
    update_time: string;
    create_time: string;

    constructor(ctx, data?: any) {
        this.ctx = ctx;
        this.id = data?.id ?? null;
        this.map_id = data?.map_id ?? null;
        this.map_area_id = data?.map_area_id ?? null;
        this.map_level = data?.map_level ?? null;
        this.teitoku_id = data?.teitoku_id ?? null;
        this.nick_name = data?.nick_name ?? null;
        this.info = data?.info ?? null;
        this.info_length = data?.info_length ?? null;
        this.deleted = data?.deleted ?? null;
        this.update_time = data?.update_time ?? null;
        this.create_time = data?.create_time ?? null;
    }

    toObject(): any {
        return {
            id: this.id,
            map_id: this.map_id,
            map_area_id: this.map_area_id,
            map_level: this.map_level,
            teitoku_id: this.teitoku_id,
            nick_name: this.nick_name,
            info: this.info,
            info_length: this.info_length,
            deleted: this.deleted,
            update_time: this.update_time,
            create_time: this.create_time,
        };
    }

    static insert = async (model: ReportSortieModel) => {
        const data = model.toObject();
        return await db('wfk_report_sortie', model.ctx).insert(data);
    };
}
