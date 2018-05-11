"use strict";
/**
 * 認証ルーター
 * @ignore
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const request = require("request-promise-native");
const LINE = require("../../line");
const user_1 = require("../user");
const authRouter = express.Router();
/**
 * サインイン
 * Cognitoからリダイレクトしてくる
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
authRouter.get('/signIn', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // stateにはイベントオブジェクトとして受け取ったリクエストボディが入っている
        const body = JSON.parse(req.query.state);
        const event = body.events[0];
        const user = new user_1.default({
            host: req.hostname,
            userId: event.source.userId,
            state: req.query.state
        });
        yield user.signIn(req.query.code);
        yield LINE.pushMessage(event.source.userId, `Signed in. ${user.payload.username}`);
        // イベントを強制的に再送信
        try {
            yield request.post(`https://${req.hostname}/webhook`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                form: body
            }).promise();
        }
        catch (error) {
            yield LINE.pushMessage(event.source.userId, error.message);
        }
        const location = 'line://';
        // if (event.type === 'message') {
        //     location = `line://oaMessage/${LINE_ID}/?${event.message.text}`;
        // }
        res.send(`
<html>
<body onload="location.href='line://'">
<div style="text-align:center; font-size:400%">
<h1>Hello ${user.payload.username}.</h1>
<a href="${location}">Back to LINE.</a>
</div>
</body>
</html>`);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * ログアウト
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
authRouter.get('/logout', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        if (req.query.userId !== undefined) {
            const user = new user_1.default({
                host: req.hostname,
                userId: req.query.userId,
                state: ''
            });
            // アプリケーション側でログアウト
            yield user.logout();
            yield LINE.pushMessage(user.userId, 'Logged out.');
            // Cognitoからもログアウト
            res.redirect(user.generateLogoutUrl());
        }
        else {
            const location = 'line://';
            res.send(`
<html>
<body onload="location.href='line://'">
<div style="text-align:center; font-size:400%">
<h1>Logged out.</h1>
<a href="${location}">Back to LINE.</a>
</div>
</body>
</html>`);
        }
    }
    catch (error) {
        next(error);
    }
}));
exports.default = authRouter;
