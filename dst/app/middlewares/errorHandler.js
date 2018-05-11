"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_1 = require("http-status");
exports.default = (err, __, res, next) => {
    console.error('kwskfs-api:iddleware:errorHandler', err);
    if (res.headersSent) {
        next(err);
        return;
    }
    // エラーオブジェクトの場合は、キャッチされた例外でクライント依存のエラーの可能性が高い
    if (err instanceof Error) {
        res.status(http_status_1.BAD_REQUEST).json({
            errors: [
                {
                    title: err.name,
                    detail: err.message
                }
            ]
        });
    }
    else {
        res.status(http_status_1.INTERNAL_SERVER_ERROR).json({
            errors: [
                {
                    title: 'internal server error',
                    detail: 'an unexpected error occurred.'
                }
            ]
        });
    }
};
