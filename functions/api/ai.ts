interface Env {
  AI: Ai;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { prompt?: string; maxTokens?: number };
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    const response = await context.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      prompt,
      max_tokens: body.maxTokens ?? 512
    });

    const text = typeof response === 'string'
      ? response
      : (response as { response?: string }).response || '';

    return Response.json({ text });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'AI request failed' },
      { status: 500 }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};
