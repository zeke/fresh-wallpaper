import 'dotenv/config'
import Replicate from 'replicate'
import download from 'download'
import { copyFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import dedent from 'dedent'

// Initialize the Replicate client with your API token from .env
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
})

let theme = process.argv[2]

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

  let predictionId
  let output

  try {
    output = await replicate.run(model, { input }, ({ id }) => {
      predictionId = id
    })

    if (Array.isArray(output)) {
      output = output[0]
    }
    const outputDir = 'outputs'
    const filename = `${predictionId}.webp`
    await download(output, outputDir, { filename })

    const outputPath = join(outputDir, filename)
    const currentFilePath = join(outputDir, '_current.webp')
    copyFileSync(outputPath, currentFilePath)
  } catch (error) {
    console.error('Error in makeImage function:', error)
  }
}

while (true) {
  const prompt = await makePrompt()
  console.log({ prompt })
  await makeImage(prompt)
  await new Promise(resolve => setTimeout(resolve, 1000))
}
