/**
 * 画像メッセージハンドラー
 * @namespace app.controllers.webhook.message.image
 */

// import * as createDebug from 'debug';

import * as LINE from '../../../../line';
import User from '../../../user';

// const debug = createDebug('kwskfs-line-assistant:controller:webhook:message:image');

export async function indexFace(user: User, messageId: string) {
    const content = await LINE.getContent(messageId);

    // faceをコレクションに登録
    const source = new Buffer(content);
    await user.indexFace(source);

    await LINE.pushMessage(user.userId, '顔写真を登録しました。Face Loginをご利用できます。');
}
