"use strict";

var fs = require('fs');
var path = require('path');

var async = require('async');
var request = require('request');
var objectAssign = require('object-assign');
var wallpaper = require('wallpaper');
var notifier = require('node-notifier');
var open = require('open');
var moment = require('moment');

var defaults = {
   subreddits: ['wallpaper', 'wallpapers', 'castles'],
   sort: 'top',
   from: 'day',
   score: 100,
   domains: ['i.imgur.com', 'imgur.com'],
   types: ['png', 'jpg', 'jpeg'],
   directory: path.join(getHomeDirectory(), '.reddit-wallpaper'),
   resolution: { width: 1920, height: 1080 }
};  

/**
 * Entry point
 */
function main() {
   loadConfig(path.join(getHomeDirectory(), '.reddit-wallpaper/config.json'), function (err, options) {
   if (err) {
			console.warn(err);
		}
		
		if (!options) {
			console.info('Using defaults', defaults);
			options = defaults;
		}
		
		if (options.domains && options.domains.length > 0) {
			options.domains = options.domains.map(function (domain) {
				return domain.toLowerCase();
			});
		}
		
		if (options.files && options.files.length > 0) {
			options.files = options.files.map(function (file) {
				return file.toLowerCase();
			});
		}
		
		loadSubreddits(options, function (err, subreddits) {
			if (err) {
				console.error('Failed to load subreddits', err);
				return;
			}
			
			var link = selectWallpaperLink(options, subreddits);
			
			if (link && link.url) {
				downloadAndSetWallpaper(link.url, options.directory, function (err, image) {
					if (err) {
						console.error(err);
						return;
					}
					
					notify(link, image, function (err) {
						if (err) {
							console.error(err);
							return;
						}
					});
				});
			}
		});
	});
}

/**
 * Loads configuration file and assigns default options
 */
function loadConfig(file, callback) {
	fs.open(file, 'r', function (err, data) {
		if (err) {
			callback(err);
			return;
		}
		
		var config;
		try {
			config = JSON.parse(data);
		} catch (ex) {
			callback(ex); 
			return;
		}
		
		callback(null, objectAssign(defaults, config));
	});	
}

/**
 * Loads all subreddit listings
 */
function loadSubreddits(options, callback) {
	async.map(options.subreddits, loadSubreddit(options), function (err, results) {
		if (err) {
			callback(err);
			return;
		}
		
		callback(null, results)
	});
}

/**
 * Loads a subreddit's listing
 */
function loadSubreddit(options) {
	return function (subreddit, callback) {
		var url = ['https://reddit.com/r/', subreddit, '/', options.sort, '.json?t=', options.from].join('');
		request(url, function (err, response, body) {
			if (err) {
				callback(err);
				return;
			}
			
			var data;
			try {
				data = JSON.parse(body);
			} catch (ex) {
				console.warn(body);
				callback(ex);
				return;
			}
			
			callback(null, data);
		});
	};
}

/**
 * Extracts top link from subreddit listings, meeting the criteria specified in options
 */
function selectWallpaperLink(options, subreddits) {
	
	return subreddits.filter(function (subreddit) {
		
		return subreddit.kind === 'Listing'
			&& subreddit.data
			&& subreddit.data.children;
			
	}).map(function (listing) {
		return listing.data.children.filter(function (link) {
			return link.kind === 't3' && link.data;
		}).map(function (link) {
			return {
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
			};
		});
	}).reduce(function (x, y) {
		return x.concat(y);
	}, []).filter(function (link) {	
		// score
		return (!link.score || link.score >= options.score)
		
			// domains
			&& (!options.domains
			|| options.domains.length === 0
			|| options.domains.indexOf(link.domain) >= 0)
			
			// types
			&& (!options.types
				|| options.types.length === 0
				|| options.types.indexOf(link.type))
			
			// resolution				
			&& (!options.resolution || link.resolution
				&& (link.resolution.width >= options.resolution.width
				&& link.resolution.height >= options.resolution.height));
				
	}).reduce(function (x, y) {
		return x.score > y.score ? x : y;
	});
}

/**
 * Downloads an image and sets it as wallpaper
 */
function downloadAndSetWallpaper(url, directory, callback) {
	downloadFile(url, directory, function (err, file) {
		if (err) {
			callback(err);
			return;
		}
		
		if (file) {
			wallpaper.set(file).then(function () {
				callback(null, file);
			});
		} else {
			callback(new Error('No file'));
		}
	});
}

/**
 * Downloads a file via url
 */
function downloadFile(url, directory, callback) {
	var fileName;
	var fileMatch = matchFile(url);
	
	if (fileMatch.length > 2) {
		fileName = [fileMatch[1], fileMatch[2]].join('.');
	} else {
		callback(new Error(['URL ', url, ' does not have a filename'].join('')));
		return;
	}
	
	var filePath = path.join(directory, fileName);
	var stream = fs.createWriteStream(filePath);
	
	request(url).on('error', function (err) {
		callback(err);
	}).pipe(stream).on('error', function (err) {
		callback(err);
	}).on('finish', function () {
		callback(null, filePath);
	});
}

/**
 * Extracts the file extension from a url
 */
function parseType(url) {
	var match = matchFile(url);
	if (match && match.length > 2) {
		return match[2];	
	}
	return '';
}

/**
 * Extracts filename from url
 */
function matchFile(url) {
	var match = url.match(/([\w,\s-]+)\.([\w]+)(\?|$|#)/i);
	if (match && match.length > 1) { 
		return match;
	}
}

/** 
 * Parses the resolution tag from link title eg. [1920 x 1080]
 */
function parseResolution(title) {
	var match = title.match(/\[\s*(\d+)\s*[×x\*]\s*(\d+)\s*\]/i);
	if (match && match.length > 2) {
		return {
			width: parseInt(match[1]),
			height: parseInt(match[2])
		};
	}
}

/**
 * Gets the home directory
 */
function getHomeDirectory() {
  return process.env.HOME || process.env.USERPROFILE;
}
 
function notify(link, icon, callback) {
	var url = 'https://reddit.com' + link.permalink;
	
	notifier.notify({
		title: link.title,
		subtitle: link.subreddit,
		icon: icon,
		open: url,
		wait: true,
		message: [
			'/r/',
			link.subreddit,
			' ', link.score, ' points, ',
			moment.unix(link.createdUtc).fromNow(),
			' by ',
			link.author].join('')
	}, function (err, response) {
		if (err) {
			callback(err);
			return;
		}	
		callback();
	});
	
	notifier.on('click', function (notifierObject, options) {
		open(url);
	});
}

if (require.main === module) {
    main();
} else {
   main.matchFile = matchFile;
   main.parseResolution = parseResolution;
   main.parseType = parseType;
   main.selectWallpaperLink = selectWallpaperLink;

   module.exports = main;
}