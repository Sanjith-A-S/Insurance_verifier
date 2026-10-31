// ──────────────────────────────────────────────────────────────────────
//  apps/claimant/src/screens/CreateClaimWizard.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Button } from '@claimlens/shared/ui';
import { queryHooks } from '../client';
import type { CreateClaimBody } from '@claimlens/shared/api/client';

const DAMAGE_AREAS = [
  'front_bumper', 'bonnet', 'grille', 'headlight_lh', 'headlight_rh',
  'front_windshield', 'roof', 'driver_door', 'passenger_door',
  'rear_bumper', 'tail_lamp', 'rear_windshield', 'boot_lid'
];

export function CreateClaimWizard({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (claimId: string) => void;
}) {
  const [step, setStep] = useState(1);
  const createClaimMutation = queryHooks.useCreateClaim();

  // Form State
  const [incidentDate, setIncidentDate] = useState('2026-10-30');
  const [incidentTime, setIncidentTime] = useState('14:30');
  const [location, setLocation] = useState('');
  const [incidentType, setIncidentType] = useState('collision');
  const [thirdParty, setThirdParty] = useState(false);
  const [policeReport, setPoliceReport] = useState(false);
  const [selectedDamage, setSelectedDamage] = useState<string[]>([]);

  const [regNo, setRegNo] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2023);
  const [vin, setVin] = useState('');

  const [isPolicyholder, setIsPolicyholder] = useState(true);
  const [driverName, setDriverName] = useState('');
  const [licenceNo, setLicenceNo] = useState('');

  const [narrative, setNarrative] = useState('');
  const [policyNo, setPolicyNo] = useState('');
  const [insurer, setInsurer] = useState('');

  const toggleDamage = (area: string) => {
    setSelectedDamage((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleFinish = async () => {
    const body: CreateClaimBody = {
      incident: {
        date: incidentDate,
        time: incidentTime,
        location: location || 'Bangalore, Karnataka',
        type: incidentType,
        thirdPartyInvolved: thirdParty,
        policeReportFiled: policeReport,
        visibleDamageAreas: selectedDamage,
      },
      vehicle: {
        registrationNumber: regNo.toUpperCase() || 'KA01AB1234',
        make: make || 'Maruti Suzuki',
        model: model || 'Swift',
        year: Number(year) || 2022,
        vin: vin || undefined,
      },
      driver: {
        isPolicyholder,
        name: driverName || undefined,
        licenceNumber: licenceNo || undefined,
      },
      narrative,
      policy: {
        policyNumber: policyNo || undefined,
        insurer: insurer || undefined,
      },
    };

    const res = await createClaimMutation.mutateAsync(body);
    onCreated(res.id);
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary-text)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: '8px',
          }}
        >
          ← Cancel and return
        </button>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
          File a New Insurance Claim
        </h1>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Step {step} of 4 — Complete each step with honest, accurate details.
        </p>
      </div>

      {/* Step Indicators */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: s <= step ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
              transition: 'background var(--duration-fast)',
            }}
          />
        ))}
      </div>

      {/* Step 1: Incident */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>1. Incident Particulars</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Date of Incident</label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Time of Incident</label>
                <input
                  type="time"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Incident Location</label>
              <input
                type="text"
                placeholder="e.g. Ring Road near Bellandur Junction, Bangalore"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Incident Type</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff' }}
                >
                  <option value="collision">Vehicle Collision / Impact</option>
                  <option value="scratch_dent">Stationary Scrape / Pillar Dent</option>
                  <option value="theft_attempted">Attempted Theft / Broken Lock</option>
                  <option value="weather_flood">Flood / Natural Inundation</option>
                  <option value="vandalism">Third-party Vandalism</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Police Report / FIR Filed?</label>
                <select
                  value={policeReport ? 'yes' : 'no'}
                  onChange={(e) => setPoliceReport(e.target.value === 'yes')}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff' }}
                >
                  <option value="no">No Police Report Filed</option>
                  <option value="yes">Yes, Police FIR or GD Entry Filed</option>
                </select>
              </div>
            </div>

            {/* Damage Areas Selection */}
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px' }}>
                Visible Damage Points (Select all that apply)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DAMAGE_AREAS.map((area) => {
                  const isSelected = selectedDamage.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleDamage(area)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 500,
                        background: isSelected ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                        color: isSelected ? '#fff' : 'var(--color-text-muted)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {area.replace(/_/g, ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="filled" size="md" onClick={() => setStep(2)}>
              Next: Vehicle & Driver →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Vehicle & Driver */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>2. Vehicle & Driver</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Vehicle Registration No.</label>
                <input
                  type="text"
                  placeholder="e.g. KA01MN4567"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff', textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Make / Manufacturer</label>
                <input
                  type="text"
                  placeholder="e.g. Maruti Suzuki, Hyundai"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Model</label>
                <input
                  type="text"
                  placeholder="e.g. Baleno, Creta"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Year of Manufacture</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Chassis / VIN Number (Optional)</label>
              <input
                type="text"
                placeholder="17-character VIN from registration card"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="outlined" size="md" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button variant="filled" size="md" onClick={() => setStep(3)}>
              Next: Narrative & Policy →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Narrative & Policy */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>3. Narrative Description</h3>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
                Describe what happened in your own words
              </label>
              <textarea
                rows={5}
                placeholder="Explain the sequence of events, weather conditions, driving speed, impact direction, and subsequent vehicle condition…"
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff', resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Policy Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. POL-2024-MN4567"
                  value={policyNo}
                  onChange={(e) => setPolicyNo(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Insurer Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC ERGO, IndiaFirst"
                  value={insurer}
                  onChange={(e) => setInsurer(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: '#fff' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="outlined" size="md" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button variant="filled" size="md" onClick={() => setStep(4)}>
              Review Claim Details →
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>4. Review & Confirm Draft</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Incident</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '2px' }}>
                  {incidentType} on {incidentDate} ({incidentTime})
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{location || 'Location specified'}</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Vehicle</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '2px' }}>
                  {make || 'Vehicle'} {model} ({year})
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{regNo.toUpperCase() || 'Reg unassigned'}</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Selected Damage Points</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', marginTop: '2px' }}>
                  {selectedDamage.length > 0 ? selectedDamage.join(', ') : 'None marked'}
                </div>
              </div>
            </div>

            {narrative && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Narrative</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', background: 'var(--color-surface-raised)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  {narrative}
                </div>
              </div>
            )}

            <div style={{ padding: '12px 16px', background: 'rgba(26,110,245,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(26,110,245,0.2)', fontSize: 'var(--text-xs)', color: 'var(--color-primary-text)' }}>
              ℹ Creating this claim saves it as a <strong>draft</strong>. You will be able to upload photographs and supporting documents before final submission.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="outlined" size="md" onClick={() => setStep(3)}>
              ← Back
            </Button>
            <Button
              variant="filled"
              size="md"
              onClick={handleFinish}
              disabled={createClaimMutation.isPending}
            >
              {createClaimMutation.isPending ? 'Creating Draft…' : 'Create Claim Draft'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

