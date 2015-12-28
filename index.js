"use strict";

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = Promise.promisifyAll(require('path'));

const request = require('request-promise');
const home = require('user-home');
const expandTilde = require('expand-tilde');
const wallpaper = require('wallpaper');
const notifier = Promise.promisifyAll(require('node-notifier'));
const moment = require('moment');

const defaults = {
   subreddits: ['wallpaper', 'wallpapers', 'castles'],
   sort: 'top',
   from: 'month',
   score: 100,
   domains: ['i.imgur.com', 'imgur.com'],
   types: ['png', 'jpg', 'jpeg'],
   shuffle: true,
   directory: path.join(home, '.reddit-wallpaper'),
   resolution: { width: 1920, height: 1080 }
};  

function main(config) {
   if (typeof config === 'string' && config !== '') {
      return loadConfig(config).then(run);
   } else if (config === '' || typeof config === 'undefined' || config === null) {
      return loadConfig(path.join(home, '.reddit-wallpaper', 'config.json')).then(run);
   } else if (typeof config === 'object') {
      return run(assignConfig(config));
   } else {
      throw new TypeError('Expected string or object, got ' + typeof config);
   }
}

function run(options) {
   return ensureDirectoryExists(options.directory)
      .then(() => loadSubreddits(options)
         .then(subreddits => selectWallpaperLink(options, subreddits))
         .then(link => downloadFile(link.url, options.directory)
            .then(file => wallpaper.set(file)
               .then(() => notify(link, file))
               .then(() => link))));
}
   

function loadConfig(file) {
   return fs.readFileAsync(file).then(data => assignConfig(JSON.parse(data)));
}

function assignConfig(options) {
   options = Object.assign(defaults, options);

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
}

function loadSubreddits(options) {
   return Promise.all(options.subreddits.map(subreddit => loadSubreddit(options, subreddit)));
}

function loadSubreddit(options, subreddit) {
   let url = ['https://reddit.com/r/', subreddit, '/', options.sort, '.json?t=', options.from].join('');
   return request(url).then(res => JSON.parse(res));
}

const defaultLink = {
   score: 0,
   createdUtc: 0,
   ups: 0,
   downs: 0
};

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
            ups: link.data.ups,
            downs: link.data.downs,
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
         selectLink(options.sort),
         defaultLink); 
   }
   
   return Promise.resolve(links.reduce(selectLink(options.sort), defaultLink));
}

function selectLink(sort) {
   switch (sort) {
      case 'top':
         return (x, y) => x.score > y.score ? x : y;
         
      case 'hot':
         return (x, y) => heat(x) > heat(y) ? x : y;
         
      case 'controversial':
         return (x, y) => controversy(x) > controversy(y) ? x : y;
         
      case 'new':
         return (x, y) => x.createdUtc > y.createdUtc ? x : y;
         
      default:
         throw new Error('Unknown sort ' + sort);
   }
}

function heat(link) {
   let order = Math.log10(Math.max(link.score, 1));

   var sign;
   if (link.score > 0) {
      sign = 1;
   } else if (link.score < 0) {
      sign = -1;
   } else {
      sign = 0;
   }
   
   let seconds = link.createdUtc - 1134028003;
   return Math.round(sign * order + seconds / 45000, 7);
}

function controversy(link) {
   if (link.downs < 0 || link.ups < 0) {
      return 0;
   }
   
   let magnitude = link.ups + link.downs;
   let balance = link.ups > link.downs ? (link.downs / link.ups) : (link.ups / link.downs);
   
   return Math.pow(magnitude, balance);
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
   return notifier.notifyAsync({
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
   main.defaults = defaults;
   main.matchFile = matchFile;
   main.parseType = parseType;
   main.parseResolution = parseResolution;
   
   module.exports = main;  
}