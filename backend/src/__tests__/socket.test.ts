import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import app from '../app';
import { initSocket } from '../config/socket';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

let ioServer: any;
let httpServer: any;
let clientSocket1: ClientSocket;
let clientSocket2: ClientSocket;
let port: number;

let user1Id: string;
let user2Id: string;

beforeAll((done) => {
  httpServer = createServer(app);
  ioServer = initSocket(httpServer);
  
  httpServer.listen(() => {
    port = (httpServer.address() as AddressInfo).port;
    done();
  });
});

beforeEach(async () => {
  // Create 2 users and a match
  const user1 = await prisma.user.create({ data: { status: 'APPROVED' }});
  const user2 = await prisma.user.create({ data: { status: 'APPROVED' }});
  
  user1Id = user1.id;
  user2Id = user2.id;

  await prisma.match.create({
    data: { user1_id: user1Id, user2_id: user2Id }
  });
});

afterEach(() => {
  if (clientSocket1) clientSocket1.disconnect();
  if (clientSocket2) clientSocket2.disconnect();
});

afterAll((done) => {
  ioServer.close();
  httpServer.close(done);
});

describe('Socket.IO Chat', () => {
  it('should reject connection without token', (done) => {
    const socket = Client(`http://localhost:${port}`);
    socket.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication error/);
      socket.disconnect();
      done();
    });
  });

  it('should connect successfully with valid token', (done) => {
    const token = jwt.sign({ id: user1Id }, JWT_SECRET);
    clientSocket1 = Client(`http://localhost:${port}`, {
      auth: { token }
    });

    clientSocket1.on('connect', () => {
      expect(clientSocket1.connected).toBe(true);
      done();
    });
  });

  it('should allow matched users to send and receive messages', (done) => {
    const token1 = jwt.sign({ id: user1Id }, JWT_SECRET);
    const token2 = jwt.sign({ id: user2Id }, JWT_SECRET);

    clientSocket1 = Client(`http://localhost:${port}`, { auth: { token: token1 } });
    clientSocket2 = Client(`http://localhost:${port}`, { auth: { token: token2 } });

    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        clientSocket1.emit('sendMessage', { partnerId: user2Id, content: 'Socket Hello' });
      }
    };

    clientSocket1.on('connect', onConnect);
    clientSocket2.on('connect', onConnect);

    clientSocket2.on('receiveMessage', (data) => {
      expect(data.message.content).toBe('Socket Hello');
      expect(data.message.from_user).toBe(user1Id);
      done();
    });
  });
});
