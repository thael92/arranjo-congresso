import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method === 'GET') {
    try {
      const data = await kv.get('congressData');
      return response.status(200).json(data);
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  } else if (request.method === 'POST') {
    try {
      const newData = request.body;
      await kv.set('congressData', newData);
      return response.status(200).json({ message: 'Data saved successfully.' });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  } else {
    return response.status(405).json({ message: 'Method not allowed.' });
  }
}
