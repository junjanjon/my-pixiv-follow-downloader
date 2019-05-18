const PixivApi = require("pixiv-api-client");
const pixiv = new PixivApi();
const fs = require("fs");
const request = require("request");
const mkdirp = require("mkdirp");
const unzip = require("unzipper");

const MAX_ILLUST_ID = 100000000000;
const SEPARATE_DIRECTORY_ID = 100000;
const WAIT_ACCESS_TIME = 3 * 1000; // 3[sec]
const NAME_PATTERN = "./pixiv/{GID}/{RID}_{NAME}";

var fileExistsSync = function (filePath) {
	try
	{
		fs.statSync(filePath);
		return true;
	}
	catch(error)
	{
		console.log(error);
		return false;
	}
};

// http://neue.cc/2009/09/18_203.html
var Format = function(template, replacement)
{
	if (typeof replacement != "object") // 可変長引数時はreplacementを詰め替え
	{
		replacement = Array.prototype.slice.call(arguments, 1);
	}
	return template.replace(/\{(.+?)\}/g, function(m, c)
	{
		return (replacement[c] != null) ? replacement[c] : m;
	});
};

var urlToFilePath = function(url, namePattern)
{
	const parts = url.split("/");
	const raw_filename = parts[parts.length - 1];
	const fileParts = raw_filename.split("_p");
	const page = ("0000" + fileParts[1].split(".")[0]).slice(-4);
	const extention = fileParts[1].split(".")[1];
	const illustId = parseInt(fileParts[0], 10);
	const filename = fileParts[0] + "_p" + page;
	const reverseId = (MAX_ILLUST_ID - illustId);
	const separateId = Math.floor(reverseId / SEPARATE_DIRECTORY_ID);
	return Format(namePattern, {
		NAME: filename,
		ID: illustId,
		PAGE: page,
		GID: separateId,
		RID: reverseId
	}) + "." + extention;
};

var ugoiraInfoToFilePath = function(illustId, imageName, namePattern)
{
	const filename = illustId + "_p" + imageName;
	const reverseId = (MAX_ILLUST_ID - illustId);
	const separateId = Math.floor(reverseId / SEPARATE_DIRECTORY_ID);
	return Format(namePattern, {
		NAME: filename,
		GID: separateId,
		RID: reverseId
	});
};

var downloadFile = function (url) {
	return new Promise(function (resolve) {
		try {
			var filePath = urlToFilePath(url, NAME_PATTERN);
			var dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
			mkdirp.sync(dirPath);

			console.log(filePath);
			if (!fileExistsSync(filePath))
			{
				request.get({
					url: url,
					headers: {
						Referer: "https://www.pixiv.net",
						Origin: "https://www.pixiv.net"
					}})
					.on("error", function(err) {
						console.log(err);
					})
					.pipe(fs.createWriteStream(filePath));
				console.log("request start");
				setTimeout(resolve, WAIT_ACCESS_TIME);
				return;
			}
			console.log("skip");
			resolve();
		}
		catch(e)
		{
			console.log("catch" + e);
			resolve();
		}
	});
};

var downloadUgoira = function(ugoiraId)
{
	return new Promise(function (resolve) {
		try {
			pixiv.ugoiraMetaData(ugoiraId).then(function (json) {
				var zip_url = json.ugoira_metadata.zip_urls.medium;
				console.log(zip_url);
				var zipFilePath = "tmp" + zip_url.substring(zip_url.lastIndexOf("/"));
				console.log(zipFilePath);

				var tmpPath = ugoiraInfoToFilePath(ugoiraId, "000.jpg", NAME_PATTERN);
				var dirPath = tmpPath.substring(0, tmpPath.lastIndexOf("/"));
				mkdirp.sync(dirPath);

				if (!fileExistsSync(zipFilePath))
				{
					request.get({
						url: zip_url,
						headers: {
							Referer: "https://www.pixiv.net",
							Origin: "https://www.pixiv.net"
						}})
						.on("error", function(err) {
							console.log(err);
						})
						.pipe(unzip.Parse())
						.on("entry", function(entry){
							var filePath = ugoiraInfoToFilePath(ugoiraId, entry.path, NAME_PATTERN);
							console.log(filePath);
							entry.pipe(fs.createWriteStream(filePath));
						});
					console.log("request ugoira : " + zip_url);
					fs.writeFileSync(zipFilePath, "finish");
					setTimeout(resolve, WAIT_ACCESS_TIME);
					return;
				}

				console.log("skip ugoira");
				setTimeout(resolve, WAIT_ACCESS_TIME);
			});
		}
		catch (e)
		{
			console.log("catch ugoira : " + e);
			setTimeout(resolve, WAIT_ACCESS_TIME);
		}
	});
};

var getIllustUrls = function(illustObject)
{
	if (illustObject.type == "ugoira")
	{
		return [];
	}
	if (Object.keys(illustObject.meta_single_page).length != 0)
	{
		return [illustObject.meta_single_page.original_image_url];
	}
	if (illustObject.meta_pages.length != 0)
	{
		var image_urls = [];
		for (var i = 0; i < illustObject.meta_pages.length; i++)
		{
			image_urls.push(illustObject.meta_pages[i].image_urls.original);
		}
		return image_urls;
	}
	console.log(illustObject.meta_single_page);
	return [];
};

var getUgoiraIds = function(illustObject)
{
	if (illustObject.type == "ugoira")
	{
		return [illustObject.id];
	}
	return [];
};

var createDownloadAndNexetPromises = function(json, no)
{
	if (no < 0)
	{
		return;
	}
	no = no - 1;

	var downloadIllustUrls = [];
	var downloadUgoiraIds = [];
	for (var i = 0; i < json.illusts.length; i++)
	{
		var illust = json.illusts[i];
		Array.prototype.push.apply(downloadIllustUrls, getIllustUrls(illust));
		Array.prototype.push.apply(downloadUgoiraIds, getUgoiraIds(illust));
	}

	for (i = 0; i < downloadIllustUrls.length; i++)
	{
		console.log(i + " : " + downloadIllustUrls[i]);
	}

	callbackLoop(downloadIllustUrls, json.next_url, no);
	ugoiraDownloadCallback(downloadUgoiraIds);
};

var ugoiraDownloadCallback = function(ugoiraIds)
{
	ugoiraIds.reduce(function(promise, value)
	{
		return promise.then(function()
		{
			return downloadUgoira(value);
		});
	}, Promise.resolve());
};

var callbackLoopUrl = function(next_url, no)
{
	if (next_url)
	{
		pixiv.requestUrl(next_url).then(function(json)
		{
			setTimeout(function(){
				createDownloadAndNexetPromises(json, no);
			}, WAIT_ACCESS_TIME);
		});				
	}
};
			
var callbackLoop = function(urls, next_url, no)
{
	try
	{
		urls.reduce(function(promise, value)
		{
			return promise.then(function()
			{
				return downloadFile(value);
			});
		}, Promise.resolve())
			.then(function(){
				console.log("next_url start then : " + next_url);
				callbackLoopUrl(next_url, no);
			}).catch(function(){
				console.log("next_url start catch : " + next_url);
				callbackLoopUrl(next_url, no);
			});
	}
	catch (e)
	{
		console.log("next_url start catch2 : " + next_url);
		callbackLoopUrl(next_url, no);
	}
};


var PixivDownloader = function()
{
};

PixivDownloader.prototype.main = function (maxPage, userName, password)
{
	pixiv
		.login(userName, password, true).then(function () {
			return pixiv.illustFollow().then(function (json) {
				createDownloadAndNexetPromises(json, maxPage);
			});
		});
};

module.exports = PixivDownloader;


