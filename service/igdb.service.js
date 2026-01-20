export async function igdbWorker(endpoint, body, clientId, authToken) {
  const igdbUrl = process.env.TWITCH_IGDB_LINK;

  const response = await fetch(`${igdbUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "text/plain",
    },
    body: body,
  });
  if (response.status !== 200)
    throw new Error(`IGDB API request failed with status ${response.status}`);
  return response.json();
}
