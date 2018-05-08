/**
 * defaultルーター
 * @ignore
 */

import * as express from 'express';

import authRouter from './auth';

const router = express.Router();

// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })

router.use(authRouter);

export default router;
