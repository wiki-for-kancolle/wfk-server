import { getLogger } from 'log4js';
import { isUndefined, first } from 'lodash';
import { OssSourceType, OssFileModel } from '../model/oss_file';
import { QiniuOptions, QiniuOSS } from './qiniu';

const __logger = getLogger('oss');
const __oss: WfkOSS[] = [];

export interface WfkOSS {
    enable: boolean;
    upload: (res: string, key: string, type: OssSourceType) => Promise<any>;
}

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

const upload = async (res: string, key: string, type: OssSourceType): Promise<any> => {
    const ossClient = first(__oss);
    if (isUndefined(ossClient)) return false;
    const result = await ossClient.upload(res, key, type).catch(err => {
        return { success: false, err };
    });
    if (!result.success) {
        __logger.error(`upload ${key} failed: `, result.err);
        return null;
    }
    __logger.debug(`upload ${key} success: `);
    return result.body;
};

export const ossUpload = async (str: string, key: string): Promise<any> => await upload(str, key, OssSourceType.text);
export const ossUploadFile = async (path: string, key: string): Promise<any> => await upload(path, key, OssSourceType.file);
export const ossUploadUrl = async (url: string, key: string): Promise<any> => await upload(url, key, OssSourceType.url);
