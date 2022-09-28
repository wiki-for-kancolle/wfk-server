export const getIp = req => {
    let ip = req?.headers['x-real-ip'] || req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    if (ip.split(',').length > 0) ip = ip.split(',')[0];
    return ip;
};
