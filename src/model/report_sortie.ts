import { Logger } from 'log4js';
import { DbModel } from './db_model';

export class ReportSortieModel extends DbModel {
    map_id: number;
    map_no: number;
    map_area_id: number;
    map_level: number;
    teitoku_id: string;
    nick_name: string;
    info: string;
    info_length: number;

    constructor(data?: any, logger?: Logger) {
        super(data, logger, ['map_id', 'map_no', 'map_area_id', 'map_level', 'teitoku_id', 'nick_name', 'info', 'info_length']);
        this.tableName = 'wfk_report_sortie';
    }
}
