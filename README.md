# Fresh Wallpaper

A Node.js command-line tool that continuously generates fresh desktop wallpapers using AI-powered image generation models on [Replicate](https://replicate.com/).

I use this with [OBS](https://obsproject.com/) to create background images on the fly during video calls and screencasts.

## Features

- Generates images from a given theme
- Sets the system desktop wallpaper
- Saves all generated images to disk (default: `~/fresh-wallpaper`)
- Saves a copy of the latest generated image as `_latest.webp` (so you can point [OBS](https://obsproject.com/) to that file)
- Adds [MediaProvenance](https://github.com/zeke/media-provenance) metadata to downloaded images so you have a record of the model, input, output, etc.

## Installation

```
npm i -g fresh-wallpaper
```

Create a [Replicate API token](https://replicate.com/account/api-tokens) and set it in your environment:

```
export REPLICATE_API_TOKEN="r8_..."
```

## Usage

```
fresh-wallpaper <theme> [options]

Options:
  --image-model <model>  Specify the image model to use (default: 'black-forest-labs/flux-schnell')
  --output <directory>   Specify the output directory for images (default: 'outputs')
  --interval <ms>        Specify the interval between image generations in milliseconds (default: 1000)
```

## Examples

Basic usage:

```sh
fresh-wallpaper "bananas dressed up like cowboys"
```

Using a different image model:

```sh
fresh-wallpaper "ZIKI the man dressed up like a cowboy" --image-model "zeke/ziki-flux:dadc276a9062240e68f110ca06521752f334777a94f031feb0ae78ae3edca58e"
```

Use a custom output directory:

```sh
fresh-wallpaper "bananas dressed up like cowboys" --output "my-images"
```

Generate images every 5 seconds (instead of 1 second, the default):

```sh
fresh-wallpaper "bananas dressed up like cowboys" --interval 5000
```

