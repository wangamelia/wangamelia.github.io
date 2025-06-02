// server.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const { YOUTUBE_API_KEY: key, PORT = 3000 } = process.env;

app.get('/api/youtube-stats', async (req, res) => {
  const ids = req.query.ids;                 // e.g. "ID1,ID2"
  if (!ids) return res.status(400).json({ error: 'ids missing' });

  try {
    // 1) video stats + snippet → get viewCount, commentCount, channelId
    const vid = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet` +
      `&id=${ids}&key=${key}`
    ).then(r => r.json());

    // 2) fetch subscriberCount for each channelId
    const channels = [
      ...new Set(vid.items.map(v => v.snippet.channelId))
    ].join(',');
    const ch  = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics` +
      `&id=${channels}&key=${key}`
    ).then(r => r.json());

    // map channelId → subscriberCount
    const subs = Object.fromEntries(
      ch.items.map(c => [c.id, c.statistics.subscriberCount])
    );

    // attach subscriberCount to each video
    vid.items.forEach(v => {
      v.statistics.subscriberCount = subs[v.snippet.channelId] || 0;
    });

    res.json(vid);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'YouTube fetch error' });
  }
});

app.listen(PORT, () =>
  console.log(`Listening on http://localhost:${PORT}`)
);