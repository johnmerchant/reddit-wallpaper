"use strict";

const fs = require('fs');
const path = require('path');

const pify = require('pify');
const request = require('request');
const wallpaper = require('wallpaper');
const notifier = require('node-notifier');
const moment = require('moment');

const defaults = {
   subreddits: ['wallpaper', 'wallpapers', 'castles'],
   sort: 'top',
   from: 'day',
   score: 100,
   domains: ['i.imgur.com', 'imgur.com'],
   types: ['png', 'jpg', 'jpeg'],
   shuffle: true,
   directory: path.join(getHomeDirectory(), '.reddit-wallpaper'),
   resolution: { width: 1920, height: 1080 }
};  

/**
 * Entry point
 */
function main() {
   
   return loadConfig(path.join(getHomeDirectory(), '.reddit-wallpaper/config.json')).then(function (options) {
      
      if (options.domains && options.domains.length > 0) {
         options.domains = options.domains.map(domain => domain.toLowerCase());
      }

      if (options.files && options.files.length > 0) {
         options.files = options.files.map(file => file.toLowerCase());
      }

      return loadSubreddits(options).then(function (subreddits) {
         let link = selectWallpaperLink(options, subreddits);
         if (link && link.url) {
            return downloadAndSetWallpaper(link.url, options.directory).then(image => notify(link, image));
         }
      });
   });
}

/**
 * Loads configuration file and assigns default options
 */
function loadConfig(file, callback) {
   return pify(fs.open)(file, 'r').then(data => Object.assign(defaults, JSON.parse(data)));	
}

/**
 * Loads all subreddit listings
 */
function loadSubreddits(options) {
   return Promise.all(options.subreddits.map(subreddit => loadSubreddit(options, subreddit)));
}

/**
 * Loads a subreddit's listing
 */
function loadSubreddit(options, subreddit) {
   let url = ['https://reddit.com/r/', subreddit, '/', options.sort, '.json?t=', options.from].join('');
   return pify(request)(url).then(res => JSON.parse(res.body));
}

/**
 * Extracts top link from subreddit listings, meeting the criteria specified in options
 */
function selectWallpaperLink(options, subreddits) {
   return subreddits
      .filter(subreddit => subreddit.kind === 'Listing' && subreddit.data && subreddit.data.children)
      .map(listing =>
         listing.data.children.filter(link => link.kind === 't3' && link.data).map(link => ({
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
         // score
         (!link.score || link.score >= options.score)
      
         // domains
         && (!options.domains
            || options.domains.length === 0
            || options.domains.indexOf(link.domain.toLowerCase()) >= 0)
         
         // types
         && (!options.types
            || options.types.length === 0
            || options.types.indexOf(link.type))
            
         // resolution				
         && (!options.resolution || (link.resolution
            && (link.resolution.width >= options.resolution.width
               && link.resolution.height >= options.resolution.height)))
         
         // shuffle
         && (!options.shuffle || !fileExists(urlFilePath(link.url, options.directory))))
               
      .reduce((x, y) => x.score > y.score ? x : y, { score : 0 });
}

/**
 * Downloads an image and sets it as wallpaper
 */
function downloadAndSetWallpaper(url, directory) {
   
   return downloadFile(url, directory).then(file => wallpaper.set(file).then(() => file));
}

/**
 * Downloads a file via url
 */
function downloadFile(url, directory) {
   let path = urlFilePath(url, directory);
   let pipe = request(url).pipe(fs.createWriteStream(path));
   
   return new Promise(function (resolve, reject) {
      pipe.on('finish', () => resolve());
      pipe.on('error', error => reject(error));
   }).then(() => path);
}

/**
 * Path to write url file
 */
function urlFilePath(url, directory) {
   let match = matchFile(url);
   if (match.length > 2) {
      return path.join(directory, [match[1], match[2]].join('.'));
   }
}

/**
 * Extracts the file extension from a url
 */
function parseType(url) {
	let match = matchFile(url);
	if (match && match.length > 2) {
		return match[2].toLowerCase();	
	}
	return '';
}

/**
 * Extracts filename from url
 */
function matchFile(url) {
	let match = url.match(/([\w,\s-]+)\.([\w]+)(\?|$|#)/i);
	if (match && match.length > 1) { 
		return match;
	}
}

/** 
 * Parses the resolution tag from link title eg. [1920 x 1080]
 */
function parseResolution(title) {
	let  match = title.match(/\[\s*(\d+)\s*[×x\*]\s*(\d+)\s*\]/i);
	if (match && match.length > 2) {
		return {
			width: parseInt(match[1]),
			height: parseInt(match[2])
		};
	}
}
 
/**
 * Shows a toast notification
 */
function notify(link, icon) {
   let url = 'https://reddit.com' + link.permalink;
   notifier.notify({
      title: link.title,
      subtitle: link.subreddit,
      open: url,
      wait: true,
      message: [
         '/r/',
         link.subreddit,
         ' ', link.score, ' points, ',
         moment.unix(link.createdUtc).fromNow(),
         ' by ',
         link.author].join('')
   });
}

/**
 * Gets the home directory
 */
function getHomeDirectory() {
  return process.env.HOME || process.env.USERPROFILE;
}

/**
 * Check if a file exists
 */
function fileExists(path) {
   try {
      return fs.statSync(path).isFile();
   } catch (err) {
      return false
   }
}

if (require.main === module) {
   main();
} else {
   main.matchFile = matchFile;
   main.parseType = parseType;
   main.parseResolution = parseResolution;
   
   module.exports = main;  
}