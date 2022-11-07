import { Server } from '../utils/server';
import { XcBill } from '../service/xc/bill';

class XcServer extends Server {}

const server = new XcServer();
server.registServices([new XcBill()]);
server.initialize();
server.start();
