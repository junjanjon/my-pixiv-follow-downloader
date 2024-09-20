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

### ログイン情報であるリフレッシュトークンを設定する

```
cp config.json.sample config.json.sample
vim config.json
```

|key|info|
|:-|:-|
|refreshToken|リフレッシュトークン。[Pixiv OAuth Flow](https://gist.github.com/junjanjon/9658c96e00b9d55eb002d83d872dd884) を参考に設定できる。|
|maxPage|指定ページまでダウンロードする。最大250ページ。1ページ20作品。|


### ダウンロードを開始する

```
mkdir -p tmp
npm run download
# node main.js
```

実行するとダウンロードを開始します。pixiv ディレクトリ以下に作品を保存します。

## Contribute

バグ報告や要望などはIssuesにお願いいたします。プルリクもお待ちしています。

## License

このソフトウェアは[MIT License](LICENSE)のもとでリリースされています。
