# reddit-wallpaper

[![Build status](https://travis-ci.org/jmercha/reddit-wallpaper.svg?branch=master)](https://travis-ci.org/jmercha/reddit-wallpaper)
[![Dependencies](https://david-dm.org/jmercha/reddit-wallpaper.svg)](https://david-dm.org/jmercha/reddit-wallpaper)

Grabs the top image from a list of subreddits and sets it as the desktop wallpaper.

## Installation

```
npm install -g reddit-wallpaper
```

## Usage

From node:

```
require('reddit-wallpaper')({
   // options
}).then(link => console.log('Background set to ' + link.url));
```

From CLI:

```
reddit-wallpaper
```

For example, you could run it on session logon or as a cronjob.

## Configuration

Example ~/.reddit-wallpaper/config.json

```
{
   "subreddits": ["wallpaper", "wallpapers", "castles"],
   "sort": "top",
   "from": "month",
   "score": 100,
   "domains": ["i.imgur.com", "imgur.com"],
   "types": ["png", "jpg", "jpeg"],
   "directory": "~/.reddit-wallpaper",
   "shuffle": true,
   "resolution": { "width": 1920, "height": 1080 }
}
```
## Options

### subreddits

Type: `array`   

list of subreddits to retrieve links from

### sort

Type: `string`

Sort links by:
   - `top`
   - `hot`
   - `new`
   - `controversial`
   
### from

Type: `string`

Get links from last...
   - `hour`
   - `day`
   - `week`
   - `month`
   - `all`
      
### score

Type: `number`

Minimum link score.

### domains

Type: `Array`

Domain whitelist.

### directory

Type: `string`

Path to save images to.

### shuffle

Type: `boolean`

Filter out wallpapers that have already been downloaded.

### resolution

Type: `object`

Minimum image resolution, extracted from link title tag: eg. `[1920x1280]`

#### width 

Type: `number`

#### height 

Type: `number`