<img src="https://motionpicture.jp/images/common/logo_01.svg" alt="motionpicture" title="motionpicture" align="right" height="56" width="98"/>

# KWSKFS LINE Assistant

[![CircleCI](https://circleci.com/gh/motionpicture/kwskfs-line-assistant.svg?style=svg&circle-token=0c65818a49ef1322b853fbc7541c929a2800d0e9)](https://circleci.com/gh/motionpicture/kwskfs-line-assistant)

## Table of contents

* [Usage](#usage)
* [Code Samples](#code-samples)
* [Jsdoc](#jsdoc)
* [License](#license)
* [Reference](#reference)

## Usage

### Environment variables

| Name                               | Required              | Purpose                 | Value                                 |
|------------------------------------|-----------------------|-------------------------|---------------------------------------|
| `DEBUG`                            | false                 | kwskfs-line-assistant:* | Debug                                 |
| `NPM_TOKEN`                        | true                  |                         | NPM auth token                        |
| `NODE_ENV`                         | true                  |                         | environment name                      |
| `MONGOLAB_URI`                     | true                  |                         | MongoDB connection URI                |
| `SENDGRID_API_KEY`                 | true                  |                         | SendGrid API Key                      |
| `GMO_ENDPOINT`                     | true                  |                         | GMO API endpoint                      |
| `GMO_SITE_ID`                      | true                  |                         | GMO SiteID                            |
| `GMO_SITE_PASS`                    | true                  |                         | GMO SitePass                          |
| `AZURE_STORAGE_CONNECTION_STRING`  | true                  |                         | Save CSV files on azure storage       |
| `LINE_BOT_CHANNEL_SECRET`          | true                  |                         | LINE Messaging API 署名検証               |
| `LINE_BOT_CHANNEL_ACCESS_TOKEN`    | true                  |                         | LINE Messaging API 認証                 |
| `API_AUTHORIZE_SERVER_DOMAIN`      | true                  |                         | KWSKFS API 認可サーバードメイン                 |
| `API_CLIENT_ID`                    | true                  |                         | KWSKFS APIクライアントID                    |
| `API_CLIENT_SECRET`                | true                  |                         | KWSKFS APIクライアントシークレット                |
| `API_TOKEN_ISSUER`                 | true                  |                         | KWSKFS APIトークン発行者                     |
| `API_CODE_VERIFIER`                | true                  |                         | KWSKFS API認可コード検証鍵                    |
| `USER_REFRESH_TOKEN`               | false                 |                         | APIのリフレッシュトークン(セットすると認証をスキップできる、開発用途) |
| `REDIS_HOST`                       | true                  |                         | ログイン状態保持ストレージ                         |
| `REDIS_PORT`                       | true                  |                         | ログイン状態保持ストレージ                         |
| `REDIS_KEY`                        | true                  |                         | ログイン状態保持ストレージ                         |
| `USER_EXPIRES_IN_SECONDS`          | true                  |                         | ユーザーセッション保持期間                         |
| `REFRESH_TOKEN_EXPIRES_IN_SECONDS` | true                  |                         | リフレッシュトークン保管期間                        |
| `WEBSITE_NODE_DEFAULT_VERSION`     | only on Azure WebApps |                         | Node.js version                       |
| `WEBSITE_TIME_ZONE`                | only on Azure WebApps | Tokyo Standard Time     |                                       |
| `AWS_ACCESS_KEY_ID`                | true                  |                         |                                       |
| `AWS_SECRET_ACCESS_KEY`            | true                  |                         |                                       |
| `FACE_MATCH_THRESHOLD`             | true                  |                         | 顔認証閾値                                 |

## Code Samples

Code sample are [here](https://github.com/motionpicture/kwskfs-line-assistant/tree/master/example).

## Jsdoc

`npm run doc` emits jsdoc to ./doc.

## License

UNLICENSED

## Reference

### LINE Reference

* [LINE BUSSINESS CENTER](https://business.line.me/ja/)
* [LINE@MANAGER](https://admin-official.line.me/)
* [API Reference](https://devdocs.line.me/ja/)
* [LINE Pay技術サポート](https://pay.line.me/jp/developers/documentation/download/tech?locale=ja_JP)
* [LINE Pay Home](https://pay.line.me/jp/)
