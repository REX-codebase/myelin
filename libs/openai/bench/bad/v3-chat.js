const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function summarize(text) {
  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: `Summarize: ${text}` }],
  });
  return chatCompletion.data.choices[0].message.content;
}

module.exports = { summarize };
