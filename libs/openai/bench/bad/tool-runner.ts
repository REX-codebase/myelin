import OpenAI from "openai";

const client = new OpenAI();

const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_time",
      description: "Get the time in a zone",
      parameters: { type: "object", properties: { zone: { type: "string" } } },
      function: ({ zone }: { zone: string }) => `12:00 in ${zone}`,
    },
  },
];

export async function run(question: string) {
  const runner = client.chat.completions.runFunctions({
    model: "gpt-4o",
    messages: [{ role: "user", content: question }],
    functions: [],
  });
  runner.on("functionCall", (call) => console.log("calling", call.name));
  return runner.finalContent();
}

export const toolsUsed = tools.length;
