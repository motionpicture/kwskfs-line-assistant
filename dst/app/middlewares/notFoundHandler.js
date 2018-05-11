"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_1 = require("http-status");
exports.default = (req, res) => {
    res.status(http_status_1.NOT_FOUND);
    res.json({
        errors: [
            {
                title: 'not found',
                detail: `router for [${req.originalUrl}] not found.`
            }
        ]
    });
};
