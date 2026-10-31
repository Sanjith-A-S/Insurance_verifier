import React, { useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context.jsx';
import { Card, Button, Field, Chip } from '../ui.jsx';

const DAMAGE_AREAS = [
  { id: 'front', label: 'Front Bumper / Grille' },
  { id: 'rear', label: 'Rear Bumper / Boot' },
  { id: 'left_side', label: 'Left Side Panels' },
  { id: 'right_side', label: 'Right Side Panels' },
  { id: 'windshield', label: 'Windshield / Glass' },
  { id: 'roof', label: 'Roof Panel' },
  { id: 'undercarriage', label: 'Undercarriage' },
];

export default function NewClaimTab({ onClaimCreated }) {
  const { setSelectedClaimId, reloadClaims } = useApp();
  const [busy, setBusy] = useState(false);

  // Form state
  const [policyNumber, setPolicyNumber] = useState('POL-DEMO-8821');
  const [registrationNumber, setRegistrationNumber] = useState('KA-01-MJ-5021');
  const [make, setMake] = useState('Hyundai');
  const [model, setModel] = useState('Creta');
  const [year, setYear] = useState(2023);
  const [vin, setVin] = useState('MALC141CMKM123456');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('14:30');
  const [location, setLocation] = useState('Indiranagar 100ft Road, Bengaluru');
  const [type, setType] = useState('collision');
  const [visibleDamageAreas, setVisibleDamageAreas] = useState(['front', 'windshield']);
  const [narrative, setNarrative] = useState('Collision with stationary concrete pillar while reversing out of parking space during rain.');

  const toggleDamageArea = (areaId) => {
    setVisibleDamageAreas((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      // 1. POST /claims creates initial draft
      const initialPayload = {
        vehicle: {
          registrationNumber,
          make,
          model,
          year: parseInt(year, 10),
          vin,
        },
        incident: {
          date,
          time,
          location,
          type,
          visibleDamageAreas,
        },
        policy: {
          policyNumber,
        },
        narrative,
      };

      const created = await api('POST', '/claims', { body: initialPayload });
      const newClaimId = created.id || created._id;

      // 2. PATCH with remaining or full fields if needed
      await api('PATCH', `/claims/${newClaimId}`, {
        body: {
          narrative,
          policy: { policyNumber },
        },
      });

      await reloadClaims();
      setSelectedClaimId(newClaimId);
      if (onClaimCreated) onClaimCreated(newClaimId);
    } catch (err) {
      console.error('Failed to create claim:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Start a New Motor Insurance Claim" subtitle="Creates a new claim draft and generates requirements">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Vehicle Information */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Field label="Policy Number">
            <input
              className="m3-input"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              required
            />
          </Field>

          <Field label="Vehicle Registration Number">
            <input
              className="m3-input"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. KA-01-AB-1234"
              required
            />
          </Field>

          <Field label="Vehicle Make & Model">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="m3-input"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="Make"
                required
              />
              <input
                className="m3-input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Model"
                required
              />
            </div>
          </Field>

          <Field label="Manufacturing Year & VIN">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="m3-input"
                type="number"
                style={{ width: '90px' }}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
              />
              <input
                className="m3-input"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="Chassis / VIN"
              />
            </div>
          </Field>
        </div>

        {/* Incident Information */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Field label="Incident Date & Time">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                className="m3-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <input
                type="time"
                className="m3-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </Field>

          <Field label="Incident Location">
            <input
              className="m3-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Street, City, Landmark"
              required
            />
          </Field>

          <Field label="Incident Type">
            <select className="m3-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="collision">Vehicle Collision</option>
              <option value="theft">Theft / Break-in</option>
              <option value="flood_weather">Weather / Flood Water Damage</option>
              <option value="fire">Fire / Spark</option>
              <option value="hit_and_run">Hit and Run</option>
            </select>
          </Field>
        </div>

        {/* Visible Damage Areas (Multi-select chips) */}
        <div>
          <label className="label-caps" style={{ marginBottom: 8, display: 'block' }}>
            Damaged Areas (Multi-Select Chips)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DAMAGE_AREAS.map((area) => {
              const active = visibleDamageAreas.includes(area.id);
              return (
                <Chip
                  key={area.id}
                  label={area.label}
                  variant={active ? 'lime' : 'grey'}
                  onClick={() => toggleDamageArea(area.id)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    border: active ? '1px solid var(--accent)' : '1px solid var(--surface-border)',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Incident Narrative */}
        <Field label="Claimant Narrative">
          <textarea
            className="m3-textarea"
            rows={3}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Describe what occurred in plain words..."
          />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <Button type="submit" variant="filled" disabled={busy}>
            {busy ? 'Creating Draft...' : 'Create Draft Claim'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

