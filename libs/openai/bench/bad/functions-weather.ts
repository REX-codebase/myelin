import OpenAI from "openai";

const client = new OpenAI();

export async function weather(city: string) {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: `Weather in ${city}?` }],
    functions: [
      {
        name: "get_weather",
        description: "Get the weather for a city",
        parameters: { type: "object", properties: { city: { type: "string" } }, required: ["city"] },
      },
    ],
    function_call: "auto",
  });
  const call = completion.choices[0].message.function_call;
  return call?.name;
}

export function reply(result: string) {
  return { role: "function" as const, name: "get_weather", content: result };
}
