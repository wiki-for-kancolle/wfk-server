import qiniu, { auth, conf, form_up } from 'qiniu';
import { getLogger } from 'log4js';
import got from 'got';
import fse from 'fs-extra';
import SparkMD5 from 'spark-md5';
import path from 'path';
import { OssSourceType } from './res';

const __logger = getLogger('qiniu');

export class QiniuOptions {
    name: string;
    zone: 'huadong' | 'huabei' | 'huanan' | 'beimei' | 'SoutheastAsia';
    prefix: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    enable: boolean;
}

export class QiniuOSS {
    private uploadToken: string;
    private config: conf.Config;
    private prefix: string;
    private mac: auth.digest.Mac;
    private expireList: Map<string, number> = new Map();
    name: string;
    bucket: string;
    enable: boolean;

    constructor(options: QiniuOptions) {
        const { accessKey, secretKey, bucket, prefix, enable, name } = options;
        this.config = new qiniu.conf.Config({
            // useHttpsDomain: true,
            zone:
                {
                    huadong: qiniu.zone.Zone_z0,
                    huabei: qiniu.zone.Zone_z1,
                    huanan: qiniu.zone.Zone_z2,
                    beimei: qiniu.zone.Zone_na0,
                    SoutheastAsia: qiniu.zone.Zone_as0,
                }[options.zone] || qiniu.zone.Zone_z0,
        });

        this.name = name;
        this.bucket = bucket;
        this.enable = enable;
        this.prefix = prefix === '' ? '' : prefix + '/';
        this.mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    }

    getToken = (keyToOverwrite: string = '') => {
        const scope = this.bucket + (keyToOverwrite === '' ? '' : `:${keyToOverwrite}`);
        const expireTime = this.expireList.get(scope) || 0;
        if (Date.now() >= expireTime) {
            const options = {
                scope,
                expires: 3600 + 600, // extra 10 minutes for safety
                returnBody:
                    '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","fname":$(fname),"mimeType":"$(mimeType)","exif":$(exif),"imageInfo":$(imageInfo),"avinfo":$(avinfo),"imageAve":$(imageAve),"ext":"$(ext)","fprefix":"$(fprefix)","uuid":"$(uuid)"}',
            };
            const putPolicy = new qiniu.rs.PutPolicy(options);
            this.uploadToken = putPolicy.uploadToken(this.mac);
            this.expireList.set(scope, Date.now() + 3600 * 1000);
            __logger.debug('token refreshed: ', scope);
        }

        return this.uploadToken;
    };

    upload = async (res: string, key: string, type: OssSourceType): Promise<any> => {
        const uploader = new qiniu.form_up.FormUploader(this.config);
        const uploadExtra = new qiniu.form_up.PutExtra();
        key = this.prefix + key;
        const token = this.getToken();
        return new Promise((resolve, reject) => {
            if (type === OssSourceType.text) {
                const tmpDir = 'tmp/oss';
                const tmpFile = tmpDir + '/' + SparkMD5.hash(res) + path.extname(key);
                fse.ensureDirSync(tmpDir);
                fse.writeFileSync(tmpFile, res);
                uploader.putFile(token, key, path.resolve(tmpFile), uploadExtra, (err, body, info) => {
                    if (err) reject(err);
                    else if (info.statusCode === 200) resolve({ success: true, body });
                    else reject(info);
                });
            } else if (type === OssSourceType.file) {
                uploader.putFile(token, key, res, uploadExtra, (err, body, info) => {
                    if (err) reject(err);
                    else if (info.statusCode === 200) resolve({ success: true, body });
                    else reject(info);
                });
            } else if (type === OssSourceType.url) {
                const stream = got.stream(res);
                uploader.putStream(token, key, stream, uploadExtra, (err, body, info) => {
                    if (err) reject(err);
                    else if (info.statusCode === 200) resolve({ success: true, body });
                    else reject(info);
                });
            }
        });
    };
}
