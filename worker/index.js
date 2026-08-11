/**
 * Minimal AlterU deployment adapter for Last Train to Dawn.
 *
 * The deployment package serves `dist/` beside this handler. Player identity,
 * saves, story generation and media remain on the AlterU platform services;
 * this worker deliberately creates no second persistence layer.
 */
export async function handleApi(request) {
  const url = new URL(request.url)

  if (request.method === 'GET' && url.pathname === '/api/health') {
    return Response.json({
      ok: true,
      game: 'last-train-to-dawn',
      campaign: 'complete',
      pacing: 'brisk',
    })
  }

  return new Response('Not Found', { status: 404 })
}

