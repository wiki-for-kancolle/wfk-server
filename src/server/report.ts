import { Server } from '../utils/server';
import { ReportSortie } from '../service/report/sortie';
import { ReportApiStart } from '../service/report/api_start2';

class ReportServer extends Server {}

const server = new ReportServer();
server.registServices([new ReportSortie(), new ReportApiStart()]);
server.initialize();
server.start();
