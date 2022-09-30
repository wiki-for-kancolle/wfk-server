import Router from '@koa/router';
import { Logger } from 'log4js';
import { isObject } from 'lodash';
import { Service, parsePostData } from '../service';
import { ReportSortieModel } from '../../model/report_sortie';

export class ReportSortie implements Service {
    registRouter = (router: Router) => {
        router.post(
            '/statistic/sortie',
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

        let data: string = ctx.request.body;
        if (data.match(/\\\\\\/)) data = data.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        // logger.debug('post data: ', data);

        this.save(ctx, data);

        ctx.body = '';
    };

    save = async (ctx, data: any) => {
        if (!isObject(data)) data = JSON.parse(data);
        if (!isObject(data)) data = JSON.parse(data);
        const info: string = JSON.stringify(data);
        const info_length = info.length;

        const model = new ReportSortieModel(ctx);
        model.map_id = data.mapId;
        model.map_area_id = data.mapAreaId;
        model.map_level = data.mapLevel;
        model.teitoku_id = data.teitokuId;
        model.nick_name = data.nickName;
        model.info = info;
        model.info_length = info_length;

        const reuslt = await ReportSortieModel.insert(model);
        ctx.logger.debug('save sortie result: ', model.map_id, model.nick_name, reuslt);
    };
}
