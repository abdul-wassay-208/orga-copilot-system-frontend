import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

// Handle /index.html with token - redirect to /accept-invitation
app.get('/index.html', (req, res) => {
  const token = req.query.token;
  if (token) {
    // Redirect to the correct route with token
    return res.redirect(`/accept-invitation?token=${token}`);
  }
  // If no token, serve index.html normally
  try {
    const indexHtml = readFileSync(join(__dirname, 'dist', 'index.html'), 'utf-8');
    res.send(indexHtml);
  } catch (error) {
    res.status(500).send('Error loading application');
  }
});

// Handle React Router - serve index.html for all routes
app.get('*', (req, res) => {
  try {
    const indexHtml = readFileSync(join(__dirname, 'dist', 'index.html'), 'utf-8');
    res.send(indexHtml);
  } catch (error) {
    res.status(500).send('Error loading application');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
