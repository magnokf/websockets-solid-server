import { Application } from './application/Application';

const port = Number(process.env.PORT) || 3000;

const app = new Application();
app.start(port);
