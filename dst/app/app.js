"use strict";
/**
 * Expressアプリケーション
 * @ignore
 */
const kwskfs = require("@motionpicture/kwskfs-domain");
const bodyParser = require("body-parser");
const createDebug = require("debug");
const express = require("express");
const errorHandler_1 = require("./middlewares/errorHandler");
const notFoundHandler_1 = require("./middlewares/notFoundHandler");
const mongooseConnectionOptions_1 = require("../mongooseConnectionOptions");
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
kwskfs.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default).then(debug).catch(console.error);
// routers
const router_1 = require("./routes/router");
const webhook_1 = require("./routes/webhook");
app.use('/', router_1.default);
app.use('/webhook', webhook_1.default);
// 404
app.use(notFoundHandler_1.default);
// error handlers
app.use(errorHandler_1.default);
module.exports = app;
