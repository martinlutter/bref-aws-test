export const handler = async (event: any) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from Lambda!",
      input: event,
    }),
  };
};
