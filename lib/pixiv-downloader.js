const PixivApi = require('pixiv-api-client');
const pixiv = new PixivApi();
const fs = require('fs');
const request = require('request');
const mkdirp = require('mkdirp');
const unzip = require('unzipper');

const MAX_ILLUST_ID = 100000000000;
const SEPARATE_DIRECTORY_ID = 100000;
const WAIT_ACCESS_TIME = 3 * 1000; // 3[sec]
const NAME_PATTERN = './pixiv/{GID}/{RID}_{NAME}';

const fileExistsSync = function (filePath) {
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
const Format = function(template, replacement)
{
    if (typeof replacement != 'object') // 可変長引数時はreplacementを詰め替え
    {
        replacement = Array.prototype.slice.call(arguments, 1);
    }
    return template.replace(/\{(.+?)\}/g, function(m, c)
    {
        return (replacement[c] != null) ? replacement[c] : m;
    });
};

const urlToFilePath = function(url, namePattern)
{
    const parts = url.split('/');
    const raw_filename = parts[parts.length - 1];
    const fileParts = raw_filename.split('_p');
    const page = ('0000' + fileParts[1].split('.')[0]).slice(-4);
    const extention = fileParts[1].split('.')[1];
    const illustId = parseInt(fileParts[0], 10);
    const filename = fileParts[0] + '_p' + page;
    const reverseId = (MAX_ILLUST_ID - illustId);
    const separateId = Math.floor(reverseId / SEPARATE_DIRECTORY_ID);
    return Format(namePattern, {
        NAME: filename,
        ID: illustId,
        PAGE: page,
        GID: separateId,
        RID: reverseId
    }) + '.' + extention;
};

const idToFilePath = function(illustId, namePattern)
{
    const extention = 'json';
    const reverseId = (MAX_ILLUST_ID - illustId);
    const filename = illustId;
    const separateId = Math.floor(reverseId / SEPARATE_DIRECTORY_ID);
    return Format(namePattern, {
        NAME: filename,
        ID: illustId,
        PAGE: '0000',
        GID: separateId,
        RID: reverseId
    }) + '.' + extention;
};


const ugoiraInfoToFilePath = function(illustId, imageName, namePattern)
{
    const filename = illustId + '_p' + imageName;
    const reverseId = (MAX_ILLUST_ID - illustId);
    const separateId = Math.floor(reverseId / SEPARATE_DIRECTORY_ID);
    return Format(namePattern, {
        NAME: filename,
        GID: separateId,
        RID: reverseId
    });
};


const getIllustUrls = function(illustObject)
{
    if (illustObject.type === 'ugoira')
    {
        return [];
    }
    if (Object.keys(illustObject.meta_single_page).length !== 0)
    {
        const imageUrl = illustObject.meta_single_page.original_image_url;
        const DISABLED_IMAGE_URL = 'https://s.pximg.net/common/images/limit_unknown_360.png';
        if (imageUrl === DISABLED_IMAGE_URL)
        {
            return [];
        }
        return [imageUrl];
    }
    if (illustObject.meta_pages.length !== 0)
    {
        const image_urls = [];
        for (let i = 0; i < illustObject.meta_pages.length; i++)
        {
            image_urls.push(illustObject.meta_pages[i].image_urls.original);
        }
        return image_urls;
    }
    console.log(illustObject.meta_single_page);
    return [];
};

const getUgoiraIds = function(illustObject)
{
    if (illustObject.type === 'ugoira')
    {
        return [illustObject.id];
    }
    return [];
};

/**
 * イラスト、マンガの1枚をダウンロードする
 * @param url ダウンロードするURL
 * @returns {Promise<boolean>} ダウンロードしたかどうか
 */
async function downloadFileAsync(url) {
    try {
        const filePath = urlToFilePath(url, NAME_PATTERN);
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        mkdirp.sync(dirPath);

        if (fileExistsSync(filePath))
        {
            console.log('skip');
            return false;
        }
        console.log('request start');
        console.log(filePath);
        await request.get({
            url: url,
            headers: {
                Referer: 'https://www.pixiv.net',
                Origin: 'https://www.pixiv.net'
            }})
            .on('error', function(err) {
                console.log(err);
            })
            .pipe(fs.createWriteStream(filePath));
        return true;
    }
    catch(e)
    {
        console.log('downloadFileAsyncでエラー');
        console.log('url: ' + url);
        console.error(e);
    }
    return true;
}

/**
 * うごイラをダウンロードする
 * @param ugoiraId ダウンロードするうごイラのID
 * @returns {Promise<boolean>} ダウンロードしたかどうか
 */
async function downloadUgoiraAsync(ugoiraId) {
    try {
        const json = await pixiv.ugoiraMetaData(ugoiraId);
        const zip_url = json.ugoira_metadata.zip_urls.medium;
        const zipFilePath = 'tmp' + zip_url.substring(zip_url.lastIndexOf('/'));

        const tmpPath = ugoiraInfoToFilePath(ugoiraId, '000.jpg', NAME_PATTERN);
        const dirPath = tmpPath.substring(0, tmpPath.lastIndexOf('/'));
        mkdirp.sync(dirPath);

        if (!fileExistsSync(zipFilePath))
        {
            await request.get({
                url: zip_url,
                headers: {
                    Referer: 'https://www.pixiv.net',
                    Origin: 'https://www.pixiv.net'
                }})
                .on('error', function(err) {
                    console.log(err);
                })
                .pipe(unzip.Parse())
                .on('entry', function(entry){
                    const filePath = ugoiraInfoToFilePath(ugoiraId, entry.path, NAME_PATTERN);
                    console.log(filePath);
                    entry.pipe(fs.createWriteStream(filePath));
                });
            console.log('request ugoira : ' + zip_url);
            fs.writeFileSync(zipFilePath, 'finish');
            return true;
        }
        console.log('skip ugoira');
        return false;
    }
    catch (e)
    {
        console.log('downloadUgoiraAsyncでエラー');
        console.log('ugoiraId: ' + ugoiraId);
        console.error(e);
    }
    return true;
}

/**
 *
 * @param json イラストリストjson
 * @param no 繰り返す残りページ数
 * @returns {Promise<void>}
 */
async function downloadRecursive(json, no)
{
    if (no < 0)
    {
        return;
    }

    const downloadIllustUrls = [];
    const downloadUgoiraIds = [];
    for (let i = 0; i < json.illusts.length; i++)
    {
        const illust = json.illusts[i];
        Array.prototype.push.apply(downloadIllustUrls, getIllustUrls(illust));
        Array.prototype.push.apply(downloadUgoiraIds, getUgoiraIds(illust));

        const filePath = idToFilePath(illust.id, NAME_PATTERN);
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        mkdirp.sync(dirPath);
        // イラストのメタデータを保存
        fs.writeFileSync(filePath, JSON.stringify(illust));
    }

    // イラストのダウンロード
    for (i = 0; i < downloadIllustUrls.length; i++)
    {
        console.log(i + ' : ' + downloadIllustUrls[i]);
        const isDownload = await downloadFileAsync(downloadIllustUrls[i]);
        if (isDownload) {
            await new Promise(resolve => setTimeout(resolve, WAIT_ACCESS_TIME));
        }
    }

    // うごイラのダウンロード
    for (i = 0; i < downloadUgoiraIds.length; i++)
    {
        console.log(i + ' : ' + downloadUgoiraIds[i]);
        const ugoiraId = downloadUgoiraIds[i];
        const isDownload = await downloadUgoiraAsync(ugoiraId);
        if (isDownload) {
            await new Promise(resolve => setTimeout(resolve, WAIT_ACCESS_TIME));
        }
    }

    // 次のページのダウンロード
    console.log('next_url start : ' + json.next_url);
    if (json.next_url === null) {
        return;
    }
    await new Promise(resolve => setTimeout(resolve, WAIT_ACCESS_TIME));
    const nextPageJson = await pixiv.requestUrl(json.next_url);
    await downloadRecursive(nextPageJson, no - 1);
}

const PixivDownloader = function()
{
};

PixivDownloader.prototype.main = async function (maxPage, refreshToken)
{
    await pixiv.refreshAccessToken(refreshToken);
    await new Promise(resolve => setTimeout(resolve, WAIT_ACCESS_TIME));
    const json = await pixiv.illustFollow();
    await new Promise(resolve => setTimeout(resolve, WAIT_ACCESS_TIME));
    await downloadRecursive(json, maxPage);
};

PixivDownloader.prototype.userBookmarksIllustDownload = async function(userId, maxPage, refreshToken)
{
    await pixiv.refreshAccessToken(refreshToken);
    await new Promise(resolve => setTimeout(resolve, WAIT_ACCESS_TIME));
    const json = await pixiv.userBookmarksIllust(userId);
    await new Promise(resolve => setTimeout(resolve, WAIT_ACCESS_TIME));
    await downloadRecursive(json, maxPage);
};

module.exports = PixivDownloader;
