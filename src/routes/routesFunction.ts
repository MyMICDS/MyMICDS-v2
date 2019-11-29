import { Application } from 'express';
import { Db } from 'mongodb';
import SocketIO from '../libs/socket.io';

type RoutesFunction = (app: Application, db: Db, socketIO: ReturnType<typeof SocketIO>) => void;
export default RoutesFunction;
