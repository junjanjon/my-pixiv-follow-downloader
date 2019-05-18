# pixiv-follow-downloader

pixiv でフォローしているユーザの作品をダウンロードします。

## Usage

### インストール

npm でインストールする。

```
cd pixiv-follow-downloader
npm install
```

### ユーザ情報を設定する

```
cp config.json.sample config.json.sample
vim config.json
```

|key|info|
|:-|:-|
|userName|pixiv ID|
|password|password|
|maxPage|指定ページまでダウンロードする。最大250ページ。1ページ20作品。|


### ダウンロードを開始する

```
node main.js
```

実行するとダウンロードを開始します。pixiv ディレクトリ以下に作品を保存します。

[pixiv_client_mechanize](https://github.com/junjanjon/pixiv_client_mechanize) と連携することで、ダウンロードした作品を簡単に見ることができます。

## Contribute

バグ報告や要望などはIssuesにお願いいたします。プルリクもお待ちしています。

## License

このソフトウェアは[MIT License](LICENSE)のもとでリリースされています。
