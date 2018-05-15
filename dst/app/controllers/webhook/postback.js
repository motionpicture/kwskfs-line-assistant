"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * LINE webhook postbackコントローラー
 */
const kwskfsapi = require("@motionpicture/kwskfs-api-nodejs-client");
const kwskfs = require("@motionpicture/kwskfs-domain");
const createDebug = require("debug");
const moment = require("moment");
const otplib = require("otplib");
const request = require("request-promise-native");
const util = require("util");
const LINE = require("../../../line");
const debug = createDebug('kwskfs-line-assistant:controller:webhook:postback');
const MESSAGE_TRANSACTION_NOT_FOUND = '該当取引はありません';
/**
 * IDで取引検索
 */
function searchTransactionById(userId, transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(userId, transactionId);
        yield LINE.pushMessage(userId, '取引IDで検索しています...');
        // 取引検索
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const transaction = yield transactionRepo.findById(kwskfs.factory.transactionType.PlaceOrder, transactionId);
        switch (transaction.status) {
            case kwskfs.factory.transactionStatusType.InProgress:
                yield LINE.pushMessage(userId, `注文取引[${transactionId}]は進行中です。`);
                break;
            case kwskfs.factory.transactionStatusType.Confirmed:
                yield pushTransactionDetails(userId, transaction.result.order.orderNumber);
                break;
            case kwskfs.factory.transactionStatusType.Expired:
                yield pushExpiredTransactionDetails(userId, transactionId);
                break;
            default:
        }
    });
}
exports.searchTransactionById = searchTransactionById;
/**
 * 注文番号で取引を検索する
 * @param userId LINEユーザーID
 * @param orderNumber 注文番号
 */
function searchTransactionByOrderNumber(userId, orderNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(userId, orderNumber);
        yield LINE.pushMessage(userId, '注文番号で検索しています...');
        // 取引検索
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        yield transactionRepo.transactionModel.findOne({
            'result.order.orderNumber': orderNumber
        }, 'result').exec().then((doc) => __awaiter(this, void 0, void 0, function* () {
            if (doc === null) {
                yield LINE.pushMessage(userId, MESSAGE_TRANSACTION_NOT_FOUND);
            }
            else {
                const transaction = doc.toObject();
                yield pushTransactionDetails(userId, transaction.result.order.orderNumber);
            }
        }));
    });
}
exports.searchTransactionByOrderNumber = searchTransactionByOrderNumber;
/**
 * 電話番号で取引を検索する
 * @param userId LINEユーザーID
 * @param tel 電話番号劇場コード
 */
function searchTransactionByTel(userId, tel) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('tel:', tel);
        yield LINE.pushMessage(userId, 'implementing...');
    });
}
exports.searchTransactionByTel = searchTransactionByTel;
/**
 * 取引IDから取引情報詳細を送信する
 * @export
 * @param userId LINEユーザーID
 * @param transactionId 取引ID
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function pushTransactionDetails(userId, orderNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, `${orderNumber}の取引詳細をまとめています...`);
        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const orderRepo = new kwskfs.repository.Order(kwskfs.mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const ownershipInfo = new kwskfs.repository.OwnershipInfo(kwskfs.mongoose.connection);
        // 取引検索
        const transaction = yield transactionRepo.transactionModel.findOne({
            'result.order.orderNumber': orderNumber,
            typeOf: kwskfs.factory.transactionType.PlaceOrder
        }).then((doc) => doc.toObject());
        // 確定取引なので、結果はundefinedではない
        const transactionResult = transaction.result;
        // 注文検索
        let order = yield orderRepo.orderModel.findOne({
            orderNumber: orderNumber
        }).exec().then((doc) => {
            return (doc === null) ? null : doc.toObject();
        });
        debug('order:', order);
        if (order === null) {
            // 注文未作成であれば取引データから取得
            order = transactionResult.order;
        }
        // 所有権検索
        const ownershipInfos = yield ownershipInfo.ownershipInfoModel.find({
            identifier: { $in: transactionResult.ownershipInfos.map((o) => o.identifier) }
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        debug(ownershipInfos.length, 'ownershipInfos found.');
        const ownershipInfosStr = ownershipInfos.map((info) => {
            const offer = info.typeOfGood;
            const ticket = offer.reservedTicket;
            const ticketedSeat = ticket.ticketedSeat;
            const ticketedMenuItem = ticket.ticketedMenuItem;
            return util.format('●%s\n￥%s\n%s x%s\n%s\n~%s', info.identifier, ticket.totalPrice, (ticketedSeat !== undefined) ? ticketedSeat.seatNumber :
                (ticketedMenuItem !== undefined) ? ticketedMenuItem.name :
                    '', (offer.numSeats !== undefined) ? offer.numSeats :
                (offer.numMenuItems !== undefined) ? offer.numMenuItems :
                    '1', offer.reservationStatus, moment(info.ownedThrough).format('YYYY-MM-DD HH:mm:ss'));
        }).join('\n');
        const report = kwskfs.service.transaction.placeOrder.transaction2report({
            order: order,
            transaction: transaction
        });
        debug('report:', report);
        // 非同期タスク検索
        const tasks = yield taskRepo.taskModel.find({
            'data.transactionId': transaction.id
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        // タスクの実行日時を調べる
        const taskStrs = tasks.map((task) => {
            let taskNameStr = task.name;
            switch (task.name) {
                case kwskfs.factory.taskName.PayPecorino:
                    taskNameStr = '口座支払';
                    break;
                case kwskfs.factory.taskName.PayCreditCard:
                    taskNameStr = 'クレカ支払';
                    break;
                case kwskfs.factory.taskName.PlaceOrder:
                    taskNameStr = '注文作成';
                    break;
                case kwskfs.factory.taskName.SendEmailMessage:
                    taskNameStr = 'メール送信';
                    break;
                case kwskfs.factory.taskName.SendOrder:
                    taskNameStr = '注文配送';
                    break;
                default:
            }
            let statusStr = '→';
            switch (task.status) {
                case kwskfs.factory.taskStatus.Ready:
                    statusStr = '-';
                    break;
                case kwskfs.factory.taskStatus.Executed:
                    statusStr = '↓';
                    break;
                case kwskfs.factory.taskStatus.Aborted:
                    statusStr = '×';
                    break;
                default:
            }
            return util.format('%s\n%s %s', (task.status === kwskfs.factory.taskStatus.Executed && task.lastTriedAt !== null)
                ? moment(task.lastTriedAt).format('YYYY-MM-DD HH:mm:ss')
                : '---------- --:--:--', statusStr, taskNameStr);
        }).join('\n');
        // 注文に対するアクション検索
        const actions = yield actionRepo.actionModel.find({
            $or: [
                { 'object.orderNumber': orderNumber },
                { 'purpose.orderNumber': orderNumber }
            ]
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        debug('actions on order found.', actions);
        // アクション履歴
        const actionStrs = actions
            .sort((a, b) => moment(a.endDate).unix() - moment(b.endDate).unix())
            .map((action) => {
            let actionName = action.typeOf;
            switch (action.typeOf) {
                case kwskfs.factory.actionType.ReturnAction:
                    actionName = '返品';
                    break;
                case kwskfs.factory.actionType.RefundAction:
                    actionName = '返金';
                    break;
                case kwskfs.factory.actionType.OrderAction:
                    actionName = '注文受付';
                    break;
                case kwskfs.factory.actionType.SendAction:
                    if (action.object.typeOf === 'Order') {
                        actionName = '配送';
                    }
                    else if (action.object.typeOf === 'EmailMessage') {
                        actionName = 'Eメール送信';
                    }
                    else {
                        actionName = `${action.typeOf} ${action.object.typeOf}`;
                    }
                    break;
                case kwskfs.factory.actionType.PayAction:
                    actionName = `支払(${action.object.paymentMethod.paymentMethod})`;
                    break;
                case kwskfs.factory.actionType.UseAction:
                    actionName = `${action.object.typeOf}使用`;
                    break;
                default:
            }
            let statusStr = '→';
            switch (action.actionStatus) {
                case kwskfs.factory.actionStatusType.CanceledActionStatus:
                    statusStr = '←';
                    break;
                case kwskfs.factory.actionStatusType.CompletedActionStatus:
                    statusStr = '↓';
                    break;
                case kwskfs.factory.actionStatusType.FailedActionStatus:
                    statusStr = '×';
                    break;
                default:
            }
            return util.format('%s\n%s %s', moment(action.endDate).format('YYYY-MM-DD HH:mm:ss'), statusStr, actionName);
        }).join('\n');
        // tslint:disable:max-line-length
        const transactionDetails = [`----------------------------
注文状態
----------------------------
${order.orderNumber}
${order.orderStatus}
----------------------------
注文照会キー
----------------------------
${order.orderInquiryKey.confirmationNumber}
${order.orderInquiryKey.telephone}
----------------------------
注文処理履歴
----------------------------
${actionStrs}
----------------------------
注文アイテム状態
----------------------------
${ownershipInfosStr}
`,
            `${order.orderNumber}
----------------------------
販売者情報
----------------------------
${transaction.seller.typeOf}
${transaction.seller.id}
${transaction.seller.name}
${transaction.seller.url}
----------------------------
購入者情報
----------------------------
${report.customer.name}
${report.customer.telephone}
${report.customer.email}
${(report.customer.memberOf !== undefined) ? `${report.customer.memberOf.membershipNumber}` : '非会員'}
----------------------------
予約イベント
----------------------------
${report.eventName}
${moment(report.eventStartDate).format('YYYY-MM-DD HH:mm')}-${moment(report.eventEndDate).format('HH:mm')}
@${report.superEventLocation} ${report.eventLocation}
----------------------------
予約チケット
----------------------------
${report.reservedTickets.map((t) => `●${t.ticketToken}\n${t.totalPrice} JPY\n${t.name} x${t.numItems}`).join('\n')}
----------------------------
決済方法
----------------------------
${(report.paymentMethod[0] !== undefined) ? report.paymentMethod[0] : ''}
${(report.paymentMethodId[0] !== undefined) ? report.paymentMethodId[0] : ''}
${(report.paymentMethod[1] !== undefined) ? report.paymentMethod[1] : ''}
${(report.paymentMethodId[1] !== undefined) ? report.paymentMethodId[1] : ''}
${report.price}
----------------------------
割引
----------------------------
${(report.discounts[0] !== undefined) ? report.discounts[0] : ''}
${(report.discountCodes[0] !== undefined) ? report.discountCodes[0] : ''}
￥${(report.discountPrices[0] !== undefined) ? report.discountPrices[0] : ''}
`,
            `${order.orderNumber}
----------------------------
注文取引
----------------------------
${transaction.id}
${report.status}
----------------------------
取引進行クライアント
----------------------------
${transaction.object.clientUser.client_id}
${transaction.object.clientUser.iss}
----------------------------
取引状況
----------------------------
${moment(report.startDate).format('YYYY-MM-DD HH:mm:ss')} 開始
${moment(report.endDate).format('YYYY-MM-DD HH:mm:ss')} 成立
----------------------------
取引処理履歴
----------------------------
${taskStrs}
`];
        yield Promise.all(transactionDetails.map((text) => __awaiter(this, void 0, void 0, function* () {
            yield LINE.pushMessage(userId, text);
        })));
        // キュー実行のボタン表示
        const postActions = [
            {
                type: 'postback',
                label: '再照会する',
                data: `action=searchTransactionById&transaction=${transaction.id}`
            }
        ];
        if (order.orderStatus === kwskfs.factory.orderStatus.OrderDelivered ||
            order.orderStatus === kwskfs.factory.orderStatus.OrderPickupAvailable) {
            // postActions.push({
            //     type: 'postback',
            //     label: 'メール送信',
            //     data: `action=pushNotification&transaction=${transaction.id}`
            // });
            postActions.push({
                type: 'postback',
                label: '返品する',
                data: `action=startReturnOrder&transaction=${transaction.id}`
            });
        }
        if (postActions.length > 0) {
            yield request.post({
                simple: false,
                url: 'https://api.line.me/v2/bot/message/push',
                auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
                json: true,
                body: {
                    to: userId,
                    messages: [
                        {
                            type: 'template',
                            altText: 'aaa',
                            template: {
                                type: 'buttons',
                                text: '本取引に対して何かアクションを実行しますか？',
                                actions: postActions
                            }
                        }
                    ]
                }
            }).promise();
        }
    });
}
/**
 * 期限切れの取引詳細を報告する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function pushExpiredTransactionDetails(userId, transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, `${transactionId}の取引詳細をまとめています...`);
        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        // 取引検索
        const transaction = yield transactionRepo.findById(kwskfs.factory.transactionType.PlaceOrder, transactionId);
        const report = kwskfs.service.transaction.placeOrder.transaction2report({
            transaction: transaction
        });
        debug('report:', report);
        // 非同期タスク検索
        const tasks = yield taskRepo.taskModel.find({
            'data.transactionId': transaction.id
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        // タスクの実行日時を調べる
        const taskStrs = tasks.map((task) => {
            let taskNameStr = task.name;
            switch (task.name) {
                case kwskfs.factory.taskName.CancelCreditCard:
                    taskNameStr = 'クレカ取消';
                    break;
                case kwskfs.factory.taskName.CancelPecorino:
                    taskNameStr = '口座承認取消';
                    break;
                case kwskfs.factory.taskName.CancelSeatReservation:
                    taskNameStr = '仮予約取消';
                    break;
                default:
            }
            let statusStr = '→';
            switch (task.status) {
                case kwskfs.factory.taskStatus.Ready:
                    statusStr = '-';
                    break;
                case kwskfs.factory.taskStatus.Executed:
                    statusStr = '↓';
                    break;
                case kwskfs.factory.taskStatus.Aborted:
                    statusStr = '×';
                    break;
                default:
            }
            return util.format('%s\n%s %s', (task.status === kwskfs.factory.taskStatus.Executed && task.lastTriedAt !== null)
                ? moment(task.lastTriedAt).format('YYYY-MM-DD HH:mm:ss')
                : '---------- --:--:--', statusStr, taskNameStr);
        }).join('\n');
        // 承認アクション検索
        const actions = yield actionRepo.actionModel.find({
            typeOf: kwskfs.factory.actionType.AuthorizeAction,
            'purpose.typeOf': kwskfsapi.factory.transactionType.PlaceOrder,
            'purpose.id': transaction.id
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        debug('actions:', actions);
        // アクション履歴
        const actionStrs = actions
            .sort((a, b) => moment(a.endDate).unix() - moment(b.endDate).unix())
            .map((action) => {
            let actionName = `${action.typeOf} of ${action.object.typeOf}`;
            if (action.purpose !== undefined) {
                actionName += ` for ${action.purpose.typeOf}`;
            }
            let description = '';
            switch (action.object.typeOf) {
                case kwskfs.factory.action.authorize.creditCard.ObjectType.CreditCard:
                    actionName = 'クレカオーソリ';
                    description = action.object.orderId;
                    break;
                case 'Offer':
                    actionName = 'Offer承認';
                    // if (action.result !== undefined) {
                    //     description = action.result.updTmpReserveSeatResult.tmpReserveNum;
                    // }
                    break;
                case kwskfs.factory.action.authorize.pecorino.ObjectType.Pecorino:
                    actionName = '口座承認';
                    if (action.result !== undefined) {
                        description = action.object.transactionId;
                    }
                    break;
                default:
            }
            let statusStr = '→';
            switch (action.actionStatus) {
                case kwskfs.factory.actionStatusType.CanceledActionStatus:
                    statusStr = '←';
                    break;
                case kwskfs.factory.actionStatusType.CompletedActionStatus:
                    statusStr = '↓';
                    break;
                case kwskfs.factory.actionStatusType.FailedActionStatus:
                    statusStr = '×';
                    break;
                default:
            }
            return util.format('%s\n%s %s\n%s %s', moment(action.endDate).format('YYYY-MM-DD HH:mm:ss'), statusStr, actionName, statusStr, description);
        }).join('\n');
        // tslint:disable:max-line-length
        const transactionDetails = [`----------------------------
注文取引概要
----------------------------
${transaction.id}
${report.status}
----------------------------
販売者情報
----------------------------
${transaction.seller.typeOf}
${transaction.seller.id}
${transaction.seller.name}
${transaction.seller.url}
----------------------------
購入者情報
----------------------------
${report.customer.name}
${report.customer.telephone}
${report.customer.email}
${(report.customer.memberOf !== undefined) ? `${report.customer.memberOf.membershipNumber}` : '非会員'}
`,
            `----------------------------
注文取引
${transaction.id}
----------------------------
取引進行クライアント
----------------------------
${transaction.object.clientUser.client_id}
${transaction.object.clientUser.iss}
----------------------------
取引状況
----------------------------
${moment(report.startDate).format('YYYY-MM-DD HH:mm:ss')} 開始
${moment(report.endDate).format('YYYY-MM-DD HH:mm:ss')} 期限切れ
----------------------------
承認アクション履歴
----------------------------
${actionStrs}
----------------------------
取引処理履歴
----------------------------
${taskStrs}
`];
        yield Promise.all(transactionDetails.map((text) => __awaiter(this, void 0, void 0, function* () {
            yield LINE.pushMessage(userId, text);
        })));
    });
}
/**
 * 返品取引開始
 */
function startReturnOrder(user, transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(user.userId, '返品取引を開始します...');
        const API_ENDPOINT = process.env.API_ENDPOINT;
        if (API_ENDPOINT === undefined) {
            throw new Error('process.env.API_ENDPOINT undefined.');
        }
        const returnOrderService = new kwskfsapi.service.transaction.ReturnOrder({
            endpoint: API_ENDPOINT,
            auth: user.authClient
        });
        const returnOrderTransaction = yield returnOrderService.start({
            // tslint:disable-next-line:no-magic-numbers
            expires: moment().add(15, 'minutes').toDate(),
            transactionId: transactionId
        });
        debug('return order transaction started.', returnOrderTransaction.id);
        // 二段階認証のためのワンタイムトークンを保管
        const secret = otplib.authenticator.generateSecret();
        const pass = otplib.authenticator.generate(secret);
        const postEvent = {
            postback: {
                data: `action=confirmReturnOrder&transaction=${returnOrderTransaction.id}&pass=${pass}`
            },
            // replyToken: '26d0dd0923a94583871ecd7e6efec8e2',
            source: {
                type: 'user',
                userId: user.userId
            },
            timestamp: 1487085535998,
            type: 'postback'
        };
        yield user.saveMFAPass(pass, postEvent);
        yield LINE.pushMessage(user.userId, '返品取引を開始しました。');
        yield LINE.pushMessage(user.userId, '二段階認証を行います。送信されてくる文字列を入力してください。');
        yield LINE.pushMessage(user.userId, pass);
    });
}
exports.startReturnOrder = startReturnOrder;
/**
 * 返品取引確定
 */
function confirmReturnOrder(user, transactionId, pass) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(user.userId, '返品取引を受け付けようとしています...');
        const postEvent = yield user.verifyMFAPass(pass);
        if (postEvent === null) {
            yield LINE.pushMessage(user.userId, 'パスの有効期限が切れました。');
            return;
        }
        // パス削除
        yield user.deleteMFAPass(pass);
        const API_ENDPOINT = process.env.API_ENDPOINT;
        if (API_ENDPOINT === undefined) {
            throw new Error('process.env.API_ENDPOINT undefined.');
        }
        const returnOrderService = new kwskfsapi.service.transaction.ReturnOrder({
            endpoint: API_ENDPOINT,
            auth: user.authClient
        });
        const result = yield returnOrderService.confirm({
            transactionId: transactionId
        });
        debug('return order transaction confirmed.', result);
        yield LINE.pushMessage(user.userId, '返品取引を受け付けました。');
    });
}
exports.confirmReturnOrder = confirmReturnOrder;
/**
 * 取引検索(csvダウンロード)
 * @export
 * @param userId ユーザーID
 * @param date YYYY-MM-DD形式
 */
function searchTransactionsByDate(userId, date) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, `${date}の取引を検索しています...`);
        const startFrom = moment(`${date}T00:00:00+09:00`);
        const startThrough = moment(`${date}T00:00:00+09:00`).add(1, 'day');
        const csv = yield kwskfs.service.transaction.placeOrder.download({
            startFrom: startFrom.toDate(),
            startThrough: startThrough.toDate()
        }, 'csv')({
            action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
            order: new kwskfs.repository.Order(kwskfs.mongoose.connection),
            ownershipInfo: new kwskfs.repository.OwnershipInfo(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
        });
        yield LINE.pushMessage(userId, 'csvを作成しています...');
        const sasUrl = yield kwskfs.service.util.uploadFile({
            fileName: `kwskfs-line-assistant-transactions-${date}.csv`,
            text: csv
        })();
        yield LINE.pushMessage(userId, `download -> ${sasUrl} `);
    });
}
exports.searchTransactionsByDate = searchTransactionsByDate;
