import { Logger } from 'log4js';
import { DbModel } from './db_model';

export enum OssSourceType {
    text = 0,
    url = 1,
    file = 2,
}

export class OssFileModel extends DbModel {
    key: string;
    fsize: number;
    fname: string;
    fprefix: string;
    ext: string;
    mime_type: string;
    md5: string;

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

    constructor(data?: any, logger?: Logger) {
        super(data, logger, [
            'key',
            'fsize',
            'fname',
            'fprefix',
            'ext',
            'mime_type',
            'md5',
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
