import 'dotenv/config'
import Replicate from 'replicate'
import { copyFileSync } from 'node:fs'
import download from 'download'
import { join } from 'node:path'
import dedent from 'dedent'
import MediaProvenance from 'media-provenance'
import { setWallpaper } from 'wallpaper'
import minimist from 'minimist'

const replicate = new Replicate()

const argv = minimist(process.argv.slice(2))
const theme = argv._[0]
const imageModel = argv['image-model'] || 'black-forest-labs/flux-schnell'
const outputDir = argv.output || 'outputs'
const interval = argv.interval || 1000

function usage () {
  console.log(dedent`
    Usage: node index.js <theme> [options]

    Options:
      --image-model <model>  Specify the image model to use (default: 'black-forest-labs/flux-schnell')
      --output <directory>   Specify the output directory for images (default: 'outputs')
      --interval <ms>        Specify the interval between image generations in milliseconds (default: 1000)

    Example:
      node index.js "bananas dressed up like cowboys" --image-model "stability-ai/stable-diffusion" --output "my-images" --interval 5000
  `)
  process.exit()
}

if (!theme) {
  usage()
}

async function makePrompt () {
  const model = 'meta/meta-llama-3.1-405b-instruct'
  const input = {
    prompt: theme,
    system_prompt: dedent`Take the given theme and turn it into a good image prompt. Always include the word ZIKI in the prompts.`.trim()
  }

  console.log('Enhancing prompt...')
  console.log({ model, input })

  const output = await replicate.run(model, { input })
  return output
    .join('')
    .replace(/^"|"$/g, '') // remove leading and trailing double quotes
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
  }
}

while (true) {
  const prompt = await makePrompt()
  console.log({ prompt })
  const imageFile = await makeImage(prompt)
  await setWallpaper(imageFile)
  await new Promise(resolve => setTimeout(resolve, interval))
  console.log('\n\n')
}
