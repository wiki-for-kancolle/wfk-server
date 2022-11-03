import Router from '@koa/router';
import { Logger } from 'log4js';
import { isObject } from 'lodash';
import SparkMD5 from 'spark-md5';
import { Service, parsePostData } from '../../utils/service';
import { ossUpload, ossUploadFile, ossUploadUrl } from '../../utils/res';
import path from 'path';
import { OssFileModel } from '../../model/oss_file';

export class ReportApiStart implements Service {
    registRouter = (router: Router) => {
        router.post(
            '/statistic/raw/kcsapi/api_start2/getData',
            async (ctx, next) => {
                ctx.request.body = await parsePostData(ctx);
                await next();
            },
            this.handle,
        );
    };

    isReady = () => true;

    handle = async (ctx, next) => {
        const logger = ctx.logger as Logger;
        if (!this.isReady()) {
            logger.warn('service is not ready');
            return;
        }

        // format data
        let data: any = ctx.request.body;
        if (data.match(/\\\\\\/)) data = data.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        if (!isObject(data)) data = JSON.parse(data);
        if (!isObject(data)) data = JSON.parse(data);
        if (!this.isValid(ctx, data)) return;
        // logger.debug('post data: ', data);

        // get remote api_start2
        const remote = JSON.stringify(data);
        const remoteMD5 = SparkMD5.hash(remote);

        // get local api_start2
        const local = null;
        const localMD5 = null;

        // compare remote with local
        if (localMD5 && remoteMD5 === localMD5) return;

        // upload file to oss

        // save to database
        // const f1 = await ossUpload(remote, 'api_start2.json');
        // const f2 = await ossUploadFile(path.resolve('example/res/8.png'), '8.png');
        // const f3 = await ossUploadUrl('https://uploads.kcwiki.cn/commons/9/93/535-DockMedDmg.mp3', '535-DockMedDmg.mp3');
        // f1 && OssFileModel.insert(f1);
        // f2 && OssFileModel.insert(f2);
        // f3 && OssFileModel.insertAll([f3]);
    };

    isValid = (ctx, data): boolean => {
        const { api_mst_ship, api_mst_slotitem, api_mst_mapinfo } = data.data;
        if (!api_mst_ship || !api_mst_slotitem || !api_mst_mapinfo) return false;
        return true;
    };
}
