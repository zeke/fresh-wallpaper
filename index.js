#!/usr/bin/env node

import 'dotenv/config'
import Replicate from 'replicate'
import { copyFileSync, mkdirSync } from 'node:fs'
import download from 'download'
import { join } from 'node:path'
import dedent from 'dedent'
import MediaProvenance from 'media-provenance'
import { setWallpaper } from 'wallpaper'
import minimist from 'minimist'
import os from 'os'

const replicate = new Replicate()

const argv = minimist(process.argv.slice(2))
const theme = argv._[0]
const imageModel = argv['image-model'] || 'black-forest-labs/flux-schnell'
const outputDir = argv.output || join(os.homedir(), 'fresh-wallpaper')
const interval = argv.interval || 1000
const enhancePrompts = argv['enhance-prompt'] || false

function usage () {
  console.log(dedent`
    Usage: fresh-wallpaper <theme> [options]

    Options:
      --image-model <model>  Specify the image model to use (default: 'black-forest-labs/flux-schnell')
      --output <directory>   Specify the output directory for images (default: '~/fresh-wallpaper')
      --interval <ms>        Specify the interval between image generations in milliseconds (default: 1000)
      --enhance-prompt       Use a language model to enhance your image generation prompt (default: false)

    Examples:
      Basic usage:
        fresh-wallpaper "bananas dressed up like cowboys"

      Using prompt enhancement:
        fresh-wallpaper "bananas dressed up like cowboys" --enhance-prompt

      Using a different image model:
        fresh-wallpaper "ZIKI the man dressed up like a cowboy" --image-model "zeke/ziki-flux:dadc276a9062240e68f110ca06521752f334777a94f031feb0ae78ae3edca58e"

      Custom output directory:
        fresh-wallpaper "bananas dressed up like cowboys" --output "cowboy-bananas"

      Generate images every 5 seconds:
        fresh-wallpaper "bananas dressed up like cowboys" --interval 5000
  `)
  process.exit()
}

async function enhancePrompt (theme) {
  if (!enhancePrompts) return theme

  const model = 'meta/meta-llama-3.1-405b-instruct'
  const input = {
    prompt: theme,
    system_prompt: dedent`Take the given theme and turn it into a good image prompt.`.trim()
  }

  console.log('Enhancing prompt...')
  console.log({ model, input })

  const output = await replicate.run(model, { input })
  const prompt = output
    .join('')
    .replace(/^"|"$/g, '') // remove leading and trailing double quotes

  console.log('Enhanced prompt:', prompt)

  return prompt
}

async function makeImage (prompt) {
  const model = imageModel
  const input = {
    prompt,
    aspect_ratio: '16:9'
  }

  let prediction
  let output

  try {
    output = await replicate.run(model, { input }, (predictionData) => {
      prediction = predictionData
    })

    if (Array.isArray(output)) {
      output = output[0]
    }

    const filename = `${prediction.id}.webp`
    await download(output, outputDir, { filename })

    const outputPath = join(outputDir, filename)

    // Add MediaProvenance metadata to the image file
    // See https://github.com/zeke/media-provenance
    const provenanceData = {
      provider: 'Replicate (https://replicate.com/)',
      model,
      input: prediction.input,
      output: prediction.output,
      meta: {
        ...prediction,
        input: undefined,
        output: undefined,
        logs: undefined
      }
    }
    await MediaProvenance.set(outputPath, provenanceData)

    copyFileSync(outputPath, join(outputDir, '_current.webp'))

    return outputPath
  } catch (error) {
    console.error('Error in makeImage function:', error)
    if (error.message && error.message.toLowerCase().includes('nsfw')) {
      console.log('NSFW error detected. Retrying with a different prompt...')
      return makeImage(await enhancePrompt(theme))
    } else {
      throw error
    }
  }
}

mkdirSync(outputDir, { recursive: true })

while (true) {
  if (!theme) usage()

  const prompt = await enhancePrompt(theme)
  const imageFile = await makeImage(prompt)
  await setWallpaper(imageFile)
  await new Promise(resolve => setTimeout(resolve, interval))
  console.log('\n\n')
}
