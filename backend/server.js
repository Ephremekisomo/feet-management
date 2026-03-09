const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db/connection');
const http = require('http');
const { initSocket } = require('./sockets');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

// Create HTTP server and attach socket.io
const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

// Routes
const vehiclesRouter = require('./routes/vehicles');
app.use('/api/vehicles', vehiclesRouter);

const driversRouter = require('./routes/drivers');
app.use('/api/drivers', driversRouter);

const fuelRouter = require('./routes/fuel');
app.use('/api/fuel', fuelRouter);

const maintenanceRouter = require('./routes/maintenance');
app.use('/api/maintenance', maintenanceRouter);

const tripsRouter = require('./routes/trips');
app.use('/api/trips', tripsRouter);

const alertsRouter = require('./routes/alerts');
app.use('/api/alerts', alertsRouter);

const insuranceRouter = require('./routes/insurance');
app.use('/api/insurance', insuranceRouter);

const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

const servicesRouter = require('./routes/services');
app.use('/api/services', servicesRouter);

const serviceRequestsRouter = require('./routes/service_requests');
app.use('/api/service-requests', serviceRequestsRouter);

const incidentsRouter = require('./routes/incidents');
app.use('/api/incidents', incidentsRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Fleet Management API' });
});

// Start the HTTP server (socket.io already initialized)
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});