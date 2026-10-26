import OpenAI from "openai";

const client = new OpenAI();

export async function weatherReport(city: string) {
  const runner = client.chat.completions.runTools({
    model: "gpt-5.5",
    messages: [{ role: "user", content: `Weather in ${city}?` }],
    tools: [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get the weather for a city",
          parameters: {
            type: "object",
            properties: { city: { type: "string" } },
            required: ["city"],
          },
          function: (args: string) => `Sunny in ${JSON.parse(args).city}`,
        },
      },
    ],
  });
  runner.on("functionToolCall", (call) => console.log("calling", call.name));
  return runner.finalContent();
}
