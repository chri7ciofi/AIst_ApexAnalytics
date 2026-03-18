fetch('http://localhost:3000/api/ai/duel', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    driver1: { name: 'VER', lapTime: '1:36.296', s1: '29.1', s2: '40.2', s3: '23.1', maxSpeed: 320 },
    driver2: { name: 'LEC', lapTime: '1:36.862', s1: '29.3', s2: '40.5', s3: '23.2', maxSpeed: 318 },
    sessionInfo: 'Bahrain 2024 - Telemetry Comparison Lap',
    speedTrace: [{ t: 0, s1: 250, s2: 248 }, { t: 0.5, s1: 255, s2: 252 }]
  })
}).then(r => r.json()).then(console.log).catch(console.error);
