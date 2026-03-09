import React, { useState, useEffect } from 'react';
import './App.css';
import { api } from './services/api';
import VehicleList from './components/VehicleList';
import VehicleForm from './components/VehicleForm';
import DriverList from './components/DriverList';
import DriverForm from './components/DriverForm';
import FuelList from './components/FuelList';
import FuelForm from './components/FuelForm';
import Login from './components/Login';
import ManagerDashboard from './components/ManagerDashboard';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import ServiceRequest from './components/ServiceRequest';
import DispatcherDashboard from './components/DispatcherDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [fuelEntries, setFuelEntries] = useState([]);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);
  const [editingFuel, setEditingFuel] = useState(null);

  useEffect(() => {
    if (user) {
      loadVehicles();
      loadDrivers();
      loadFuelEntries();
    }
  }, [user]);
  // Socket.IO realtime updates (replace polling)
  useEffect(() => {
    if (!user) return;
    // connect to socket server (API_BASE without /api)
    const base = (process.env.REACT_APP_API_BASE || 'http://localhost:3001/api').replace('/api', '');
    // lazy-load socket.io-client to avoid SSR issues
    const { io } = require('socket.io-client');
    const socket = io(base);
    socket.on('connect', () => {
      console.log('socket connected', socket.id);
    });
    socket.on('vehicle_created', (vehicle) => {
      setVehicles(prev => {
        // avoid duplicates
        if (prev.some(v => v.id === vehicle.id)) return prev;
        return [vehicle, ...prev];
      });
    });
    socket.on('vehicle_updated', (vehicle) => {
      setVehicles(prev => prev.map(v => v.id === vehicle.id ? vehicle : v));
    });
    return () => {
      socket.disconnect();
    };
  }, [user]);

  const loadVehicles = async () => {
    try {
      const data = await api.getVehicles();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setVehicles([]);
    }
  };

  const loadDrivers = async () => {
    try {
      const data = await api.getDrivers();
      setDrivers(data.drivers || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
      setDrivers([]);
    }
  };

  const loadFuelEntries = async () => {
    try {
      const data = await api.getFuelEntries();
      setFuelEntries(data.fuel_entries || []);
    } catch (error) {
      console.error('Error loading fuel entries:', error);
      setFuelEntries([]);
    }
  };

  const handleCreateVehicle = async (vehicle) => {
    try {
      await api.createVehicle(vehicle);
      loadVehicles();
    } catch (error) {
      console.error('Error creating vehicle:', error);
    }
  };

  const handleUpdateVehicle = async (id, vehicle) => {
    try {
      await api.updateVehicle(id, vehicle);
      loadVehicles();
      setEditingVehicle(null);
    } catch (error) {
      console.error('Error updating vehicle:', error);
    }
  };

  const handleDeleteVehicle = async (id) => {
    try {
      await api.deleteVehicle(id);
      loadVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  const handleCreateDriver = async (driver) => {
    try {
      // If username/password provided, create a user account for the driver first
      if (driver.username && driver.password) {
        try {
          const userRes = await api.createUser({ username: driver.username, password: driver.password, role: 'driver', email: driver.contact_info, sendEmail: !!driver.sendEmail });
          // if user created, attach user_id to driver payload
          if (userRes && userRes.id) {
            driver.user_id = userRes.id;
          }
        } catch (userErr) {
          console.error('Error creating user account for driver:', userErr);
          alert('Failed to create user account for driver: ' + (userErr.message || userErr));
          return;
        }
      }
      // Remove credential fields before creating driver DB record
      const payload = { ...driver };
      delete payload.username;
      delete payload.password;
      await api.createDriver(payload);
      loadDrivers();
    } catch (error) {
      console.error('Error creating driver:', error);
    }
  };

  const handleUpdateDriver = async (id, driver) => {
    try {
      // If driver is linked to a user and password provided, update user password first
      if (driver.user_id && driver.password) {
        try {
          await api.updateUser(driver.user_id, { password: driver.password });
        } catch (userErr) {
          console.error('Error updating linked user password:', userErr);
          alert('Failed to update driver login password: ' + (userErr.message || userErr));
          return;
        }
      }
      // remove password/username fields before updating driver record
      const payload = { ...driver };
      delete payload.password;
      delete payload.username;
      await api.updateDriver(id, payload);
      loadDrivers();
      setEditingDriver(null);
    } catch (error) {
      console.error('Error updating driver:', error);
    }
  };

  const handleDeleteDriver = async (id) => {
    try {
      await api.deleteDriver(id);
      loadDrivers();
    } catch (error) {
      console.error('Error deleting driver:', error);
    }
  };

  const handleCreateFuel = async (fuel) => {
    try {
      await api.createFuelEntry(fuel);
      loadFuelEntries();
    } catch (error) {
      console.error('Error creating fuel entry:', error);
    }
  };

  const handleUpdateFuel = async (id, fuel) => {
    try {
      await api.updateFuelEntry(id, fuel);
      loadFuelEntries();
      setEditingFuel(null);
    } catch (error) {
      console.error('Error updating fuel entry:', error);
    }
  };

  const handleDeleteFuel = async (id) => {
    try {
      await api.deleteFuelEntry(id);
      loadFuelEntries();
    } catch (error) {
      console.error('Error deleting fuel entry:', error);
    }
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Show manager dashboard for managers
  if (user.role === 'manager') {
    return (
      <div className="App">
        <header>
          <h1>Fleet Management System</h1>
          <p>Welcome, {user.username} ({user.role}) <button className="logout-btn" onClick={() => setUser(null)}>Logout</button></p>
        </header>
        <ManagerDashboard
          vehicles={vehicles}
          drivers={drivers}
          fuelEntries={fuelEntries}
          onCreateVehicle={handleCreateVehicle}
          onUpdateVehicle={handleUpdateVehicle}
          onDeleteVehicle={handleDeleteVehicle}
          onCreateDriver={handleCreateDriver}
          onUpdateDriver={handleUpdateDriver}
          onDeleteDriver={handleDeleteDriver}
        />
      </div>
    );
  }

  // Maintenance dashboard for maintenance role
  if (user.role === 'maintenance') {
    return (
      <div className="App">
        <MaintenanceDashboard
          vehicles={vehicles}
          onUpdateVehicle={handleUpdateVehicle}
        />
      </div>
    );
  }

  // Service dashboard - pour demander un service
  if (user.role === 'service') {
    return (
      <div className="App">
        <header>
          <h1>Fleet Management System - CICR</h1>
          <p>Bienvenue, {user.username} (Service) <button className="logout-btn" onClick={() => setUser(null)}>Logout</button></p>
        </header>
        <ServiceRequest
          user={user}
          vehicles={vehicles}
        />
      </div>
    );
  }

  // Dispatcher dashboard - pour attribuer les vehicules aux chauffeurs
  if (user.role === 'dispatcher') {
    return (
      <div className="App">
        <header>
          <h1>Fleet Management System - Dispatcher CICR</h1>
          <p>Bienvenue, {user.username} (Dispatcher) <button className="logout-btn" onClick={() => setUser(null)}>Logout</button></p>
        </header>
        <DispatcherDashboard
          user={user}
          vehicles={vehicles}
          drivers={drivers}
        />
      </div>
    );
  }

  // Driver dashboard
  if (user.role === 'driver') {
    const DriverDashboard = require('./components/DriverDashboard').default;
    return (
      <div className="App">
        <header>
          <h1>Fleet Management System</h1>
          <p>Welcome, {user.username} ({user.role}) <button className="logout-btn" onClick={() => setUser(null)}>Logout</button></p>
        </header>
        <DriverDashboard
          user={user}
          vehicles={vehicles}
        />
      </div>
    );
  }

  // Admin dashboard (existing)
  const canManageVehicles = ['admin', 'manager'].includes(user.role);
  const canManageDrivers = ['admin', 'manager'].includes(user.role);
  const canTrackFuel = ['admin', 'manager', 'driver'].includes(user.role);

  return (
    <div className="App">
      <header>
        <h1>Fleet Management System</h1>
        <p>Welcome, {user.username} ({user.role}) <button className="logout-btn" onClick={() => setUser(null)}>Logout</button></p>
      </header>
      {canManageVehicles && (
        <div className="section">
          <h2>Vehicles</h2>
          <VehicleForm
            onSubmit={editingVehicle ? (vehicle) => handleUpdateVehicle(editingVehicle.id, vehicle) : handleCreateVehicle}
            initialData={editingVehicle}
          />
          <VehicleList
            vehicles={vehicles}
            drivers={drivers}
            onEdit={setEditingVehicle}
            onDelete={handleDeleteVehicle}
          />
        </div>
      )}
      {canManageDrivers && (
        <div className="section">
          <h2>Drivers</h2>
          <DriverForm
            onSubmit={editingDriver ? (driver) => handleUpdateDriver(editingDriver.id, driver) : handleCreateDriver}
            initialData={editingDriver}
          />
          <DriverList
            drivers={drivers}
            onEdit={setEditingDriver}
            onDelete={handleDeleteDriver}
          />
        </div>
      )}
      {canTrackFuel && (
        <div className="section">
          <h2>Fuel Tracking</h2>
          <FuelForm
            onSubmit={editingFuel ? (fuel) => handleUpdateFuel(editingFuel.id, fuel) : handleCreateFuel}
            initialData={editingFuel}
            vehicles={vehicles}
          />
          <FuelList
            fuelEntries={fuelEntries}
            onEdit={setEditingFuel}
            onDelete={handleDeleteFuel}
          />
        </div>
      )}
    </div>
  );
}

export default App;