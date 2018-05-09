/**
 * Expressアプリケーション
 * @ignore
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as bodyParser from 'body-parser';
import * as createDebug from 'debug';
import * as express from 'express';

import errorHandler from './middlewares/errorHandler';
import notFoundHandler from './middlewares/notFoundHandler';

import mongooseConnectionOptions from '../mongooseConnectionOptions';

const debug = createDebug('kwskfs-line-assistant:*');

const app = express();

// view engine setup
// app.set('views', `${__dirname}/views`);
// app.set('view engine', 'ejs');

app.use(bodyParser.json());
// The extended option allows to choose between parsing the URL-encoded data
// with the querystring library (when false) or the qs library (when true).
app.use(bodyParser.urlencoded({ extended: true }));

// 静的ファイル
// app.use(express.static(__dirname + '/../public'));

// MongoDB接続
kwskfs.mongoose.connect(<string>process.env.MONGOLAB_URI, mongooseConnectionOptions)
    .then(() => { debug('MongoDB connected.') }).catch(console.error);

// routers
import router from './routes/router';
import webhookRouter from './routes/webhook';
app.use('/', router);
app.use('/webhook', webhookRouter);

// 404
app.use(notFoundHandler);

// error handlers
app.use(errorHandler);

export = app;
