import { Server } from './server';
import { ReportSortie } from '../service/report/sortie';

class ReportServer extends Server {}

const server = new ReportServer();
server.registServices([new ReportSortie()]);
server.start();
