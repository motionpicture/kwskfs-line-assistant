/**
 * 404ハンドラーミドルウェア
 */
import { Request, Response } from 'express';
import { NOT_FOUND } from 'http-status';

export default (req: Request, res: Response) => {
    res.status(NOT_FOUND);
    res.json({
        errors: [
            {
                title: 'not found',
                detail: `router for [${req.originalUrl}] not found.`
            }
        ]
    });
};
