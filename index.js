import 'dotenv/config'
import Replicate from 'replicate'
import { copyFileSync } from 'node:fs'
import download from 'download'
import { join } from 'node:path'
import dedent from 'dedent'
import MediaProvenance from 'media-provenance'
import { setWallpaper } from 'wallpaper'

const replicate = new Replicate()

const theme = process.argv[2]
const outputDir = 'outputs'
const interval = 1000

async function makePrompt () {
  // if (!theme) {
  //   const transcriptPath = join(process.env.HOME, 'eavesdrop-transcript.txt')
  //   const fileContent = readFileSync(transcriptPath, 'utf-8')
  //   const lines = fileContent.trim().split('\n')
  //   theme = lines.slice(-3).join('\n')
  // }

  return theme

  const model = 'meta/meta-llama-3.1-405b-instruct'
  const input = {
    prompt: theme,
    system_prompt: dedent`Take the given theme and turn it into a good image prompt. Always include the word ZIKI in the prompts.`.trim()
  }

  console.log({ input })

  const output = await replicate.run(model, { input })
  return output
    .join('')
    .replace(/^"|"$/g, '') // remove leading and trailing double quotes
}

async function makeImage (prompt) {
  // const model = 'black-forest-labs/flux-schnell'
  const model = 'zeke/ziki-flux:dadc276a9062240e68f110ca06521752f334777a94f031feb0ae78ae3edca58e'
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
}
