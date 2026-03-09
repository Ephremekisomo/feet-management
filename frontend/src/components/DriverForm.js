import React, { useState, useEffect } from 'react';

function DriverForm({ onSubmit, initialData }) {
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    contact_info: '',
    username: '',
    password: '',
    sendEmail: true
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        license_number: initialData.license_number || '',
        contact_info: initialData.contact_info || '',
        username: initialData.username || '',
        password: '', // do not prefill password
        sendEmail: false
      });
    } else {
      setFormData({
        name: '',
        license_number: '',
        contact_info: '',
        username: '',
        password: '',
        sendEmail: true
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    if (!initialData) {
      setFormData({
        name: '',
        license_number: '',
        contact_info: '',
        username: '',
        password: '',
        sendEmail: true
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{initialData ? 'Edit Driver' : 'Add Driver'}</h2>
      <input name="name" value={formData.name} onChange={handleChange} placeholder="Name" required />
      <input name="license_number" value={formData.license_number} onChange={handleChange} placeholder="License Number" required />
      <input name="contact_info" value={formData.contact_info} onChange={handleChange} placeholder="Contact Info (use email to send credentials)" />
      <input name="username" value={formData.username} onChange={handleChange} placeholder="Username (for driver login)" required={!initialData} />
      <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder={initialData ? 'New password (leave blank to keep)' : 'Password'} required={!initialData} />
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        <input type="checkbox" name="sendEmail" checked={!!formData.sendEmail} onChange={(e)=>setFormData({...formData, sendEmail: e.target.checked})} />
        <span style={{ fontSize: '0.9em' }}>Send credentials to driver's contact email</span>
      </label>
      <button type="submit">{initialData ? 'Update' : 'Add'}</button>
    </form>
  );
}

export default DriverForm;