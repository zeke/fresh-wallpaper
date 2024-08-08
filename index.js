import Replicate from 'replicate'
import download from 'download'
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'

const replicate = new Replicate()

const theme = process.argv[2] || 'nature'

async function makePrompt () {
  const model = 'meta/meta-llama-3.1-405b-instruct'
  const input = {
    prompt: `Something ${theme} themed`,
    system_prompt: "You write descriptive and stylistic prompts for image generation models. The prompts should generate images that look good with a human's face green-screened and centered on a layer above it. You don't talk about the prompt. You just output it.",
  };
  
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

    const filename = `${predictionId}.webp`
    await download(output, '.', { filename })

    const currentFilePath = join('.', '_current.webp')
    copyFileSync(filename, currentFilePath)
  } catch (error) {
    console.error('Error in makeImage function:', error)
  }
}

while (true) {
  const prompt = await makePrompt()
  console.log({prompt})
  await makeImage(prompt)
  await new Promise(resolve => setTimeout(resolve, 1000))
}
