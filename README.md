# reddit-wallpaper

[![Build status](https://travis-ci.org/jmercha/reddit-wallpaper.svg?branch=master)](https://travis-ci.org/jmercha/reddit-wallpaper)
[![Dependencies](https://david-dm.org/jmercha/reddit-wallpaper.svg)](https://david-dm.org/jmercha/reddit-wallpaper)

Grabs the top image from a list of subreddits and sets it as the desktop wallpaper.

## Installation
```
git clone https://github.com/jmercha/reddit-wallpaper.git
cd reddit-wallpaper
npm install
node --harmony .
```

## Configuration

Example ~/.reddit-wallpaper/config.json

	{
		"subreddits": ["wallpaper", "wallpapers", "castles"]
		"sort": "top",
		"from": "day",
		"score": 100,
		"domains": ["i.imgur.com", "imgur.com"],
		"types": ["png", "jpg", "jpeg"],
		"directory": "~/.reddit-wallpaper",
		"resolution": { "width": 1920, "height": 1080 }
	}