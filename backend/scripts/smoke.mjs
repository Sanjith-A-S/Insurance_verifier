/**
 * ClaimLens AI — End-to-end HTTP Smoke Test
 * Walks full claims lifecycle over real HTTP requests.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  return { status: res.status, ok: res.ok, body, headers: res.headers };
}

async function runSmoke() {
  console.log(`\n========================================`);
  console.log(`🚀 ClaimLens AI Backend — Smoke Test Runner`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`========================================\n`);

  let passed = 0;
  let failed = 0;

  function step(name, ok, details = '') {
    if (ok) {
      console.log(`  ✅ [PASS] ${name} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('/health');
    step('Health Check', health.status === 200 && health.body.ok === true, `status: ${health.body?.data?.status}`);

    // 2. Demo users
    const users = await request('/demo/users');
    step('Fetch Demo Users', users.status === 200 && Array.isArray(users.body.data) && users.body.data.length >= 6);

    // 3. Create Draft Claim (Aarav)
    const draftRes = await request('/claims', {
      method: 'POST',
      headers: { 'X-Demo-User-Id': 'usr_aarav' },
      body: JSON.stringify({
        incident: {
          date: '2026-10-25',
          time: '14:00',
          location: 'Delhi Connaught Place',
          type: 'collision',
          visibleDamageAreas: ['front'],
        },
        vehicle: {
          registrationNumber: 'DL-01-AB-1234',
          make: 'Maruti',
          model: 'Swift',
          year: 2022,
        },
        driver: { isPolicyholder: true, name: 'Aarav Kumar' },
        narrative: 'Front bumper hit stationary bollard.',
        policy: { policyNumber: 'POL-DEL-1234', insurer: 'National Insurance' },
      }),
    });
    const claim = draftRes.body?.data;
    step('Create Draft Claim', draftRes.status === 201 && claim?.id?.startsWith('CL-'), `Claim ID: ${claim?.id}`);

    // 4. Capture Session
    const sessionRes = await request(`/claims/${claim.id}/capture-sessions`, {
      method: 'POST',
      headers: { 'X-Demo-User-Id': 'usr_aarav' },
    });
    step('Create Capture Session', sessionRes.status === 201 && Boolean(sessionRes.body?.data?.captureSessionId));

    // 5. Submit without evidence (Preconditions check) -> 400
    const submitFail = await request(`/claims/${claim.id}/submit`, {
      method: 'POST',
      headers: { 'X-Demo-User-Id': 'usr_aarav' },
    });
    step('Enforce Submit Preconditions (needs photo + doc)', submitFail.status === 400 && submitFail.body?.error?.code === 'VALIDATION_ERROR');

    // 6. Verifier Assigns Claim (Meera)
    const assignRes = await request(`/claims/CL-2045/assign`, {
      method: 'POST',
      headers: { 'X-Demo-User-Id': 'usr_meera' },
      body: JSON.stringify({ assigneeId: 'me' }),
    });
    step('Assign Claim to Verifier', assignRes.status === 200 && assignRes.body?.data?.assigneeId === 'usr_meera');

    // 7. Verifier Runs Analysis (CL-2041) -> 202
    const analysisRes = await request(`/claims/CL-2041/analysis`, {
      method: 'POST',
      headers: { 'X-Demo-User-Id': 'usr_meera' },
    });
    step('Trigger Analysis (202 Accepted)', analysisRes.status === 202 && analysisRes.body?.ok === true);

    // 8. Poll Analysis Status
    const statusRes = await request(`/claims/CL-2041/analysis/status`, {
      headers: { 'X-Demo-User-Id': 'usr_meera' },
    });
    step('Poll Analysis Status', statusRes.status === 200 && Boolean(statusRes.body?.data?.state));

    // 9. Fetch Full Analysis & Settlement (CL-2041 = ₹47,600)
    const detailRes = await request(`/claims/CL-2041/analysis`, {
      headers: { 'X-Demo-User-Id': 'usr_meera' },
    });
    const settlement = detailRes.body?.data?.settlement;
    step('Retrieve Ready Analysis & Settlement', detailRes.status === 200 && settlement?.resultAmount === 47600, `Settlement: ₹${settlement?.resultAmount}`);

    // 10. Evidence Request Lifecycle
    const reqCreate = await request(`/claims/CL-2041/requests`, {
      method: 'POST',
      headers: { 'X-Demo-User-Id': 'usr_meera' },
      body: JSON.stringify({
        title: 'Smoke Test Request',
        reason: 'Verification check for smoke lifecycle',
        status: 'sent',
      }),
    });
    const requestId = reqCreate.body?.data?.id;
    step('Send Evidence Request', reqCreate.status === 201 && Boolean(requestId));

    // 11. Claimant Response
    const respRes = await request(`/claims/CL-2041/requests/${requestId}/responses`, {
      method: 'POST',
      headers: { 'X-Demo-User-Id': 'usr_aarav' },
      body: JSON.stringify({ message: 'Acknowledged by claimant' }),
    });
    step('Claimant Submits Request Response', respRes.status === 201 && respRes.body?.data?.status === 'response_submitted');

    // 12. Resolve Request
    const resolveRes = await request(`/claims/CL-2041/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'X-Demo-User-Id': 'usr_meera' },
      body: JSON.stringify({ action: 'resolve' }),
    });
    step('Resolve Evidence Request', resolveRes.status === 200 && resolveRes.body?.data?.status === 'resolved');

    // 13. Messages Thread
    const msgRes = await request(`/claims/CL-2041/messages`, {
      method: 'POST',
      headers: { 'X-Demo-User-Id': 'usr_aarav' },
      body: JSON.stringify({ body: 'Smoke test claimant question' }),
    });
    step('Send Claim-Facing Message', msgRes.status === 201 && Boolean(msgRes.body?.data?.id));

    // 14. Private Note (Verifier Only)
    const noteRes = await request(`/claims/CL-2041/private-notes`, {
      method: 'POST',
      headers: { 'X-Demo-User-Id': 'usr_meera' },
      body: JSON.stringify({ body: 'Internal note for smoke run' }),
    });
    step('Record Private Note (Verifier Only)', noteRes.status === 201 && Boolean(noteRes.body?.data?.id));

    // 15. Record Decision
    const decRes = await request(`/claims/CL-2041/decisions`, {
      method: 'POST',
      headers: { 'X-Demo-User-Id': 'usr_meera' },
      body: JSON.stringify({
        decision: 'recommend_approve',
        rationale: 'Fully consistent smoke test lifecycle',
        recommendedAmount: 47600,
      }),
    });
    step('Record Decision', decRes.status === 201 && decRes.body?.data?.decision === 'recommend_approve');

    // 16. Verifier Dashboard
    const dashRes = await request('/investigator/dashboard', {
      headers: { 'X-Demo-User-Id': 'usr_meera' },
    });
    step('Fetch Investigator Dashboard', dashRes.status === 200 && dashRes.body?.data?.totals?.total >= 10, `Total: ${dashRes.body?.data?.totals?.total}`);

  } catch (err) {
    console.error('\nSmoke test encountered critical error:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSmoke();
