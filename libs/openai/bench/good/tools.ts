import OpenAI from "openai";

const client = new OpenAI();

const tools = [
  {
    type: "function" as const,
    function: {
      name: "lookup_order",
      description: "Look up an order by id",
      parameters: {
        type: "object",
        properties: { orderId: { type: "string" } },
        required: ["orderId"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

export async function support(question: string) {
  const completion = await client.chat.completions.create({
    model: "gpt-5.5",
    messages: [{ role: "user", content: question }],
    tools,
    tool_choice: "auto",
    max_completion_tokens: 800,
  });
  return completion.choices[0].message;
}
