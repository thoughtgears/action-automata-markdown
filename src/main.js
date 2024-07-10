const { OpenAI } = require('openai')
const core = require('@actions/core')
const axios = require('axios')
const github = require('@actions/github')
const { Octokit } = require('@octokit/rest')

async function fetchStyleGuide(url) {
  try {
    const response = await axios.get(url)
    return response.data
  } catch (error) {
    throw new Error(`Failed to fetch style guide: ${error.message}`)
  }
}

async function run() {
  const openaiApiKey = core.getInput('openai_api_key', { required: true })
  const githubToken = core.getInput('github_token', { required: true })
  const styleguideURL = core.getInput('styleguide_url', { required: true })
  const markdownFiles = core.getInput('markdown_files', { required: true })
  const markdownFilesArray = markdownFiles.split(',').map(file => file.trim())

  const styleGuideContent = await fetchStyleGuide(styleguideURL)
  const pullRequestNumber = github.context.payload.pull_request.number
  const repository = github.context.repo
  const pullRequestBody = github.context.payload.pull_request.body

  const octokit = new Octokit({ auth: githubToken })
  const openai = new OpenAI({
    apiKey: openaiApiKey
  })

  for (const markdownFile of markdownFilesArray) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are an expert in Markdown formatting. Your task is to ensure that the provided Markdown content 
          adheres to the specified style guide. The style guide is available at the following URL: ${styleGuideContent}. 
          Evaluate each section of the Markdown document, make necessary changes to improve formatting and compliance 
          with the style guide, and provide a clear rationale for each change. Your output should be in JSON format 
          with the structure specified below. Only include sections where changes are necessary. 
          Do not alter the actual text content, only the formatting and headers.`
        },
        {
          role: 'user',
          content: `Please improve the Markdown content according to the style guide found at the following URL:
          ${styleGuideContent}. Provide your output in the following JSON format:
          {
            "parts": [
              {
                "original": "The original header and text",
                "improved": "The improved header and text",
                "rationale": "Why the changes have been made according to the style guide"
              }
            ]
          }

          Each part should cover only one header and its associated text. Headers and text that do not need changes 
          should be omitted. Below is the Markdown content that needs to be reviewed:

          ${markdownFile}`
        }
      ]
    })
    const data = JSON.parse(completion.choices[0].message.content)
    console.log(data)
    console.log(pullRequestBody)
  }
}

module.exports = { run }
