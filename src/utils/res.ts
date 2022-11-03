import { getLogger } from 'log4js';
import { isUndefined, first } from 'lodash';
import { OssFileModel } from '../model/oss_file';
import { QiniuOptions, QiniuOSS } from './qiniu';

const __logger = getLogger('oss');
const __oss: QiniuOSS[] = [];

export enum OssSourceType {
    text = 0,
    url = 1,
    file = 2,
}

const toOssFile = (result: any): OssFileModel => {
    const { body } = result;
    const file = new OssFileModel({
        key: body.key,
        fsize: body.fsize,
        mime_type: body.mimeType,

        image_ave: body.imageAve?.RGB,
        image_format: body.imageInfo?.format,
        image_width: body.imageInfo?.width,
        image_height: body.imageInfo?.height,
        image_size: body.imageInfo?.size,
        audio_duration: body.avinfo?.audio?.duration,
    });
    return file;
};

const upload = async (res: string, key: string, type: OssSourceType): Promise<OssFileModel | null> => {
    const ossClient = first(__oss);
    if (isUndefined(ossClient)) return null;
    const result = await ossClient.upload(res, key, type).catch(err => {
        return { success: false, err };
    });
    if (!result.success) {
        __logger.error(`upload ${ossClient.name} ${key} failed: `, result.err);
        return null;
    }
    const file = toOssFile(result);
    file.bucket = ossClient.bucket;
    file.oss_name = ossClient.name;
    file.source_type = type;
    file.source_url = type === OssSourceType.url ? res : '';
    file.source_file = type === OssSourceType.file ? res : '';
    __logger.debug(`upload ${ossClient.name} ${key} success: `);
    return file;
};

export const ossInit = (env?: QiniuOptions[]) => {
    if (env) {
        env.forEach(opt => {
            if (opt.enable) {
                __oss.push(new QiniuOSS(opt));
                __logger.info(`${opt.name} oss initialized`);
            }
        });
    } else __logger.warn('missing oss config');
};

export const ossUpload = async (str: string, key: string): Promise<OssFileModel | null> => await upload(str, key, OssSourceType.text);
export const ossUploadFile = async (path: string, key: string): Promise<OssFileModel | null> => await upload(path, key, OssSourceType.file);
export const ossUploadUrl = async (url: string, key: string): Promise<OssFileModel | null> => await upload(url, key, OssSourceType.url);
