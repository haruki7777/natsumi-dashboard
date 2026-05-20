import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.SERVER_PORT || process.env.PORT || 3000);
const distDir = path.join(__dirname, 'dist');

app.use(express.static(distDir, {
  maxAge: '1h',
  etag: true,
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Natsumi dashboard listening on ${port}`);
});
