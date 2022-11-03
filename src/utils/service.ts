import Router from '@koa/router';

export const parsePostData = ctx => {
    return new Promise((resolve, reject) => {
        try {
            let postData = '';
            ctx.req.on('data', data => {
                postData += data;
            });
            ctx.req.on('end', () => {
                resolve(postData);
            });
        } catch (err) {
            reject(err);
        }
    });
};

export interface Service {
    registRouter(router: Router);
    isReady(): boolean;
}
