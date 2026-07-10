async function test() {
  const query = `
    [out:json][timeout:25];
    node["addr:city"="Czeladź"]["addr:street"]["addr:housenumber"];
    out tags 5;
  `;
  const url = 'https://overpass-api.de/api/interpreter';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'SWD-Simulator/1.0',
        'Accept': 'application/json'
      },
      body: 'data=' + encodeURIComponent(query)
    });
    const data = await res.json();
    console.log(JSON.stringify(data.elements.map(e => e.tags).slice(0, 5), null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
