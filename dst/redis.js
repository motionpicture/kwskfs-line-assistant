"use strict";
/**
 * redis cacheクライアント
 * @module
 */
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("ioredis");
exports.default = new redis({
    host: process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
