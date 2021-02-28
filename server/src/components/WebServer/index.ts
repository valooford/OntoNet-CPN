import express from 'express';

const PORT = 3000;

class WebServer {
  private readonly server = express();

  constructor() {
    this.server.get('/', (req, res) => {
      res.send('<h1>Hello from Node.js</h1>');
    });
  }

  run(): void {
    this.server.listen(PORT, () => {
      console.log(`Listening on port ${PORT}...`);
      return;
    });
  }
}

export default WebServer;
