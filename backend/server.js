require('dotenv').config();
const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Az io példány elmentése, hogy a kontrollerek elérhessék req.app.get('io') módon
app.set('io', io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚗 DriveCheck API fut a ${PORT} porton.`));