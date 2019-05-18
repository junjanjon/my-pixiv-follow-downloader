const PixivDownloader = require("./lib/pixiv-downloader");
const config = require("./config.json");

var pixivDownloader = new PixivDownloader();

pixivDownloader.main(config["maxPage"], config["userName"], config["password"]);
