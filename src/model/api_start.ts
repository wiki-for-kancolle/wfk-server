import { Logger } from 'log4js';
import { DbModel } from '../utils/db_model';

export class ApiStartModel extends DbModel {
    oss_id: number;
    md5: string;

    constructor(data?: any) {
        super(data, ['oss_id', 'md5']);
        this.tableName = 'wfk_api_start';
    }
}
