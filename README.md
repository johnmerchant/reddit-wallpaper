# reddit-wallpaper

Grabs the top image off subreddits and sets it as the desktop wallpaper.

## Configuration

Example ~/.reddit-wallpaper/config.json

	{
		"sort": "top",
		"from": "day",
		"score": 100,
		"domains": ["i.imgur.com", "imgur.com"],
		"types": ["png", "jpg", "jpeg"],
		"directory": "~/.reddit-wallpaper",
		"resolution": { "width": 1920, "height": 1080 }
	}