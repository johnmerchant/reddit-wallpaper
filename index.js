"use strict";

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = Promise.promisifyAll(require('path'));

const request = require('request-promise');
const userHome = require('user-home');
const expandTilde = require('expand-tilde');
const wallpaper = require('wallpaper');
const notifier = require('node-notifier');
const moment = require('moment');

const defaults = {
   subreddits: ['wallpaper', 'wallpapers', 'castles'],
   sort: 'top',
   from: 'month',
   score: 100,
   domains: ['i.imgur.com', 'imgur.com'],
   types: ['png', 'jpg', 'jpeg'],
   shuffle: true,
   directory: path.join(userHome, '.reddit-wallpaper'),
   resolution: { width: 1920, height: 1080 }
};  

function main(config) {
   return loadConfig(config || path.join(userHome, '.reddit-wallpaper', 'config.json'))
      .then(options => ensureDirectoryExists(options.directory)
         .then(() => loadSubreddits(options)
            .then(subreddits => selectWallpaperLink(options, subreddits))
            .then(link => downloadFile(link.url, options.directory)
               .then(file => wallpaper.set(file)
                  .then(() => notify(link, file))
                  .then(() => link)))));
}

function loadConfig(file, callback) {
   return fs.readFileAsync(file).then(function (data) {
      let options = Object.assign(defaults, JSON.parse(data));

      if (options.domains) {
         options.domains = options.domains.map(domain => domain.toLowerCase());
      }

      if (options.files) {
         options.files = options.files.map(file => file.toLowerCase());
      }

      if (options.directory.indexOf('~') >= 0) {
         options.directory = expandTilde(options.directory);
      }
      
      return options;
   });
}

function loadSubreddits(options) {
   return Promise.all(options.subreddits.map(subreddit => loadSubreddit(options, subreddit)));
}

function loadSubreddit(options, subreddit) {
   let url = ['https://reddit.com/r/', subreddit, '/', options.sort, '.json?t=', options.from].join('');
   return request(url).then(res => JSON.parse(res));
}

function selectWallpaperLink(options, subreddits) {
   let links = subreddits
      .filter(subreddit => subreddit.kind === 'Listing' && subreddit.data && subreddit.data.children)
      .map(listing =>
         listing.data.children.filter(link => link.kind.toLowerCase() === 't3' && link.data).map(link => ({
            url: link.data.url,
            subreddit: link.data.subreddit,
            permalink: link.data.permalink,
            title: link.data.title,
            author: link.data.author,
            score: link.data.score,
            createdUtc: link.data.created_utc,
            domain: link.data.domain.toLowerCase(),
            type: parseType(link.data.url).toLowerCase(),
            resolution: parseResolution(link.data.title)
         })))
      .reduce((x, y) => x.concat(y), [])
      .filter(link =>    
         (!link.score || link.score >= options.score)
         
         && (!options.domains
            || options.domains.length === 0
            || options.domains.indexOf(link.domain.toLowerCase()) >= 0)
         
         && (!options.types
            || options.types.length === 0
            || options.types.indexOf(link.type) >= 0)
                   
         && (!options.resolution || (link.resolution
            && (link.resolution.width >= options.resolution.width
               && link.resolution.height >= options.resolution.height))));

   if (options.shuffle) {
      return Promise.reduce(
         Promise.filter(links, link => fileExists(urlFilePath(link.url, options.directory)).then(exists => !exists)),
         selectMaxLink,
         { score: 0 }); 
   }
   
   return Promise.resolve(links.reduce(selectMaxLink, { score: 0 }));
}

function selectMaxLink(x, y) {
   return x.score > y.score ? x : y;
}

function downloadFile(url, directory) {
   let file = urlFilePath(url, directory);
   return request(url, { encoding: null })
      .then(data => fs.writeFileAsync(file, data))
      .then(() => file);
}

function urlFilePath(url, directory) {
   let match = matchFile(url);
   if (match.length > 2) {
      return path.join(directory, [match[1], match[2]].join('.'));
   }
}

function parseType(url) {
    let match = matchFile(url);
    if (match && match.length > 2) {
        return match[2].toLowerCase();    
    }
    return '';
}

function matchFile(url) {
    let match = url.match(/([\w,\s-]+)\.([\w]+)(\?|$|#)/i);
    if (match && match.length > 1) { 
        return match;
    }
}

function parseResolution(title) {
    let match = title.match(/\[\s*(\d+)\s*[×x\*]\s*(\d+)\s*\]/i);
    if (match && match.length > 2) {
        return {
            width: parseInt(match[1]),
            height: parseInt(match[2])
        };
    }
}

function notify(link, icon) {
   let url = 'https://reddit.com' + link.permalink;
   
   return new Promise(function(resolve, reject) {
      notifier.notify({
         title: link.title,
         subtitle: link.subreddit,
         open: url,
         wait: true,
         message: [
            '/r/',
            link.subreddit,
            ' ',
            link.score,
            ' points, ',
            moment.unix(link.createdUtc).fromNow(),
            ' by ',
            link.author
         ].join('')
      }, function (err, res) {
         if (err) {
            reject(err);
            return;
         }
         
         resolve(res);
      });
   });
}

function fileExists(filePath) {
   return filePath
      ? fs.statAsync(filePath)
         .then(file => file.isFile())
         .catch(() => false)
      : Promise.resolve(false);
}

function directoryExists(directory) {
   return directory
      ? fs.statAsync(directory)
         .then(dir => dir.isDirectory())
         .catch(() => false)
      : Promise.resolve(false);
}

function ensureDirectoryExists(directory) {
   return directoryExists(directory).then(function (exists) {
      if (exists) {
         return;
      }
         
      return fs.mkdirAsync(directory);
   });
}

if (require.main === module) {
   main();   
} else {
   main.matchFile = matchFile;
   main.parseType = parseType;
   main.parseResolution = parseResolution;
   
   module.exports = main;  
}