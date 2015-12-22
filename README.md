# reddit-wallpaper

Grabs the top image from a list of subreddits and sets it as the desktop wallpaper.

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