import 'dotenv/config'
import Replicate from 'replicate'
import download from 'download'
import { copyFileSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import dedent from 'dedent'
import { platform } from 'node:process'
import MediaProvenance from 'media-provenance'

const replicate = new Replicate()

let theme = process.argv[2]
const outputDir = 'outputs'
const interval = 1000

async function makePrompt () {
  if (!theme) {
    const transcriptPath = join(process.env.HOME, 'eavesdrop-transcript.txt')
    const fileContent = readFileSync(transcriptPath, 'utf-8')
    const lines = fileContent.trim().split('\n')
    theme = lines.slice(-3).join('\n')
  }

  const model = 'meta/meta-llama-3.1-405b-instruct'
  const input = {
    prompt: theme,
    system_prompt: dedent`
      You write descriptive and stylistic prompts for image generation models. 
      The prompts should generate images that look good with a human's face green-screened and centered on a layer above it. 
      You don't talk about the prompt. You just output it.
      The prompt you receive is a transcribed snippet of a recorded conversation. Select the topic from the conversation that is most identifiable as something that can be portrayed in an image, and use that as the subject.
    `
  }

  console.log({ input })

  const output = await replicate.run(model, { input })
  return output.join('')
}

async function makeImage (prompt) {
  const model = 'black-forest-labs/flux-schnell'
  const input = {
    prompt,
    aspect_ratio: '16:9',
    output_format: 'webp',
    output_quality: 90
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

async function setWallpaper (outputPath) {
  try {
    if (platform === 'darwin') {
      const absolutePath = join(process.cwd(), outputPath)
      const setWallpaperCommand = `osascript -e 'tell application "System Events" to set picture of every desktop to "${absolutePath}"'`
      execSync(setWallpaperCommand)
      console.log('Desktop wallpaper updated successfully')
    } else {
      console.log('Setting wallpaper is only supported on macOS')
    }
  } catch (wallpaperError) {
    console.error('Error setting desktop wallpaper:', wallpaperError)
  }
}

while (true) {
  const prompt = await makePrompt()
  console.log({ prompt })
  const imageFile = await makeImage(prompt)
  await setWallpaper(imageFile)
  await new Promise(resolve => setTimeout(resolve, interval))
}
