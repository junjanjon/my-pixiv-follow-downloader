[![CircleCI](https://circleci.com/gh/junjanjon/my-pixiv-follow-downloader.svg?style=svg)](https://circleci.com/gh/junjanjon/my-pixiv-follow-downloader)

# pixiv-follow-downloader

pixiv でフォローしているユーザの作品をダウンロードします。

[my-pixiv-viewer](https://github.com/junjanjon/my-pixiv-viewer) を利用することで、ダウンロードした作品を簡単に見ることができます。

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
npm run download
# node main.js
```

実行するとダウンロードを開始します。pixiv ディレクトリ以下に作品を保存します。

## Contribute

バグ報告や要望などはIssuesにお願いいたします。プルリクもお待ちしています。

## License

このソフトウェアは[MIT License](LICENSE)のもとでリリースされています。
