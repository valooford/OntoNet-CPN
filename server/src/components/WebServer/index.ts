import express from 'express';

const PORT = 3000;

class WebServer {
  constructor() {
    const app = express();

    app.get('/', (req, res) => {
      res.send('<h1>Hello from Node.js</h1>');
    });
    app.listen(PORT, () => {
      console.log(`Listening on port ${PORT}...`);
      return;
    });
  }
}

export default WebServer;
