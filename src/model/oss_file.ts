import { Logger } from 'log4js';
import { DbModel } from '../utils/db_model';
import { OssSourceType } from '../utils/res';

export class OssFileModel extends DbModel {
    key: string;
    fsize: number;
    mime_type: string;

    image_ave: string;
    image_format: string;
    image_width: number;
    image_height: number;
    image_size: number;
    audio_duration: number;

    bucket: string;
    oss_name: string;
    source_type: OssSourceType;
    source_url: string;
    source_file: string;

    constructor(data?: any) {
        super(data, [
            'key',
            'fsize',
            'mime_type',
            'image_ave',
            'image_format',
            'image_width',
            'image_height',
            'image_size',
            'audio_duration',
            'bucket',
            'oss_name',
            'source_type',
            'source_url',
            'source_file',
        ]);
        this.tableName = 'wfk_oss_files';
    }
}
