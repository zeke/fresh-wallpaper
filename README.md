# Fresh Backgrounds

A Node.js script that continuously generates fresh backgrounds for video conferencing.

## Features

- Continuously generates images from a given theme
- Optionally sets the system desktop wallpaper
- Saves all generated images to disk
- Saves a copy of the latest generated image as `_latest.webp` (so you can point [OBS](https://obsproject.com/) to that file)

## Installation

```
git clone https://github.com/zeke/fresh-backgrounds
cd fresh-backgrounds
npm install
```

Create a [Replicate API token](https://replicate.com/account/api-tokens) and set it in your environment:

```
export REPLICATE_API_TOKEN="r8_..."
```

## Usage

```
node index.js "bananas dressed up like cowboys"
```

