import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/db/connect.js';

console.log('\n=============================================================');
console.log('    ClaimLens DevConsole Endpoints Full Smoke Test           ');
console.log('=============================================================\n');

async function runSmoke() {
  await connectDB();
  const PORT = 4007;
  const server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}/api/v1`;

  const results = [];
  const failures = [];

  const call = async (name, method, path, { body, headers = {}, formData } = {}) => {
    const start = Date.now();
    const url = `${baseUrl}${path}`;
    try {
      const fetchOpts = {
        method,
        headers: {
          'X-Demo-User-Id': 'usr_meera', // default verifier
          ...headers,
        },
      };

      if (formData) {
        fetchOpts.body = formData;
      } else if (body) {
        fetchOpts.headers['Content-Type'] = 'application/json';
        fetchOpts.body = JSON.stringify(body);
      }

      const res = await fetch(url, fetchOpts);
      const duration = Date.now() - start;
      let json = null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        json = await res.json();
      } else {
        const text = await res.text();
        json = { raw: text.slice(0, 50) };
      }

      const passed = res.status >= 200 && res.status < 300 && json?.ok !== false;
      const record = { name, method, path, status: res.status, duration, passed, error: json?.error };
      results.push(record);

      if (passed) {
        console.log(`  [PASS] [${res.status}] ${method.padEnd(6)} ${path} (${duration}ms)`);
      } else {
        console.log(`  [FAIL] [${res.status}] ${method.padEnd(6)} ${path} (${duration}ms)`);
        console.log(`         Error: ${JSON.stringify(json)}`);
        failures.push({ name, method, path, status: res.status, error: json });
      }
      return json?.data !== undefined ? json.data : json;
    } catch (err) {
      console.log(`  [ERR]  ${method.padEnd(6)} ${path}: ${err.message}`);
      failures.push({ name, method, path, status: 0, error: err.message });
      return null;
    }
  };

  try {
    // 1. Health
    await call('Health', 'GET', '/health', { headers: { 'X-Demo-User-Id': '' } });

    // 2. Demo Users
    await call('Demo Users', 'GET', '/demo/users');

    // 3. Demo Reset
    await call('Demo Reset', 'POST', '/demo/reset');

    // 4. Claims List (Verifier)
    const claims = await call('Claims List (Verifier)', 'GET', '/claims');
    const claimId = 'CL-2041'; // Seeded baseline claim

    // 5. Claims List (Claimant)
    await call('Claims List (Claimant)', 'GET', '/claims', { headers: { 'X-Demo-User-Id': 'usr_aarav' } });

    // 6. Claim Detail
    await call('Claim Detail', 'GET', `/claims/${claimId}`);

    // 7. Create Draft Claim (Claimant)
    const newClaim = await call('Create Claim (Claimant)', 'POST', '/claims', {
      headers: { 'X-Demo-User-Id': 'usr_aarav' },
      body: {
        vehicle: { registrationNumber: 'KA-01-SMOKE-1', make: 'Honda', model: 'City', year: 2022 },
        incident: { date: '2026-06-15', location: 'MG Road, Bangalore' },
      },
    });
    const createdClaimId = newClaim?.id;

    // 8. Patch Draft Claim
    if (createdClaimId) {
      await call('Patch Claim', 'PATCH', `/claims/${createdClaimId}`, {
        headers: { 'X-Demo-User-Id': 'usr_aarav' },
        body: { narrative: 'Updated smoke test narrative' },
      });
    }

    // 9. Assign Claim to Me (Verifier)
    await call('Assign Claim', 'POST', `/claims/${claimId}/assign`);

    // 10. Update Status
    await call('Patch Status', 'PATCH', `/claims/${claimId}/status`, {
      body: { status: 'in_review' },
    });

    // 11. Checklist
    const checklist = await call('Get Checklist', 'GET', `/claims/${claimId}/checklist`);
    const checklistItemId = checklist?.[0]?.id || 'policy_schedule';

    // 12. Checklist Unavailable (Claimant)
    await call('Checklist Unavailable', 'PATCH', `/claims/${claimId}/checklist/${checklistItemId}/unavailable`, {
      headers: { 'X-Demo-User-Id': 'usr_aarav' },
      body: { reason: 'Original schedule misplaced by owner' },
    });

    // 13. Evidence List
    const evidenceList = await call('Get Evidence', 'GET', `/claims/${claimId}/evidence`);
    const evId = evidenceList?.[0]?.id || 'EV-CL-2041-01';

    // 14. Evidence File
    await call('Get Evidence File', 'GET', `/claims/${claimId}/evidence/${evId}/file`);

    // 15. Evidence Thumbnail
    await call('Get Evidence Thumbnail', 'GET', `/claims/${claimId}/evidence/${evId}/thumbnail`);

    // 16. Evidence Review (Verifier)
    await call('Review Evidence', 'POST', `/claims/${claimId}/evidence/${evId}/review`, {
      body: { reviewStatus: 'reviewed', reviewNote: 'Smoke verified' },
    });

    // 17. Analysis Status
    await call('Get Analysis Status', 'GET', `/claims/${claimId}/analysis/status`);

    // 18. Trigger Analysis
    await call('Trigger Analysis', 'POST', `/claims/${claimId}/analysis`);

    // Poll until analysis state === ready
    for (let i = 0; i < 20; i++) {
      const st = await call('Poll Analysis Status', 'GET', `/claims/${claimId}/analysis/status`);
      if (st?.state === 'ready') break;
      await new Promise((r) => setTimeout(r, 150));
    }

    // 19. Get Analysis Detail
    await call('Get Analysis', 'GET', `/claims/${claimId}/analysis`);

    // 20. Matrix Annotate
    await call('Matrix Annotate', 'POST', `/claims/${claimId}/analysis/matrix/annotate`, {
      body: { rowId: 'row_registration', text: 'Smoke annotation match' },
    });

    // 21. Settlement Get
    await call('Get Settlement', 'GET', `/claims/${claimId}/settlement`);

    // 22. Settlement Recalculate
    await call('Settlement Recalculate', 'POST', `/claims/${claimId}/settlement/recalculate`);

    // 23. Settlement Override
    await call('Settlement Override', 'POST', `/claims/${claimId}/settlement/override`, {
      body: { amount: 46000, rationale: 'Smoke test agreed amount' },
    });

    // 24. Requests List
    await call('Get Requests', 'GET', `/claims/${claimId}/requests`);

    // 25. Create Request (Verifier)
    const newReq = await call('Create Request', 'POST', `/claims/${claimId}/requests`, {
      body: { title: 'Smoke DL Scan', reason: 'Driving license copy required' },
    });
    const reqId = newReq?.id;

    // 26. Send Request
    if (reqId) {
      await call('Send Request', 'POST', `/claims/${claimId}/requests/${reqId}/send`);

      // 27. Claimant Respond to Request
      await call('Respond to Request', 'POST', `/claims/${claimId}/requests/${reqId}/response`, {
        headers: { 'X-Demo-User-Id': 'usr_aarav' },
        body: { message: 'Uploaded driving license scan', unavailable: false },
      });

      // 28. Resolve Request
      await call('Resolve Request', 'POST', `/claims/${claimId}/requests/${reqId}/resolve`);
    }

    // 29. Messages Thread
    await call('Get Messages', 'GET', `/claims/${claimId}/messages`);

    // 30. Post Message
    await call('Post Message', 'POST', `/claims/${claimId}/messages`, {
      body: { body: 'Smoke test verification message from verifier' },
    });

    // 31. Mark Messages Read
    await call('Mark Messages Read', 'POST', `/claims/${claimId}/messages/read`);

    // 32. Private Notes (Verifier)
    await call('Get Private Notes', 'GET', `/claims/${claimId}/private-notes`);

    // 33. Post Private Note
    await call('Post Private Note', 'POST', `/claims/${claimId}/private-notes`, {
      body: { body: 'Confidential investigator note for smoke test' },
    });

    // 34. Timeline
    await call('Get Timeline', 'GET', `/claims/${claimId}/timeline`);

    // 35. Decisions History
    await call('Get Decisions', 'GET', `/claims/${claimId}/decisions`);

    // 36. Record Decision
    await call('Post Decision', 'POST', `/claims/${claimId}/decisions`, {
      body: {
        decision: 'recommend_approve',
        rationale: 'Smoke verification approval recommendation',
        recommendedAmount: 46000,
      },
    });

    // 37. Recommendations Get
    await call('Get Recommendations', 'GET', `/claims/${claimId}/recommendations`);

    // 38. Recommendations Offer (Verifier)
    await call('Offer Recommendation', 'POST', `/claims/${claimId}/recommendations/offer`, {
      body: { offerToClaimant: true },
    });

    // 39. Recommendations Request (Claimant)
    await call('Request Recommendation', 'POST', `/claims/${claimId}/recommendations/request`, {
      headers: { 'X-Demo-User-Id': 'usr_aarav' },
    });

    // 40. Dashboard (Verifier)
    await call('Get Dashboard', 'GET', '/investigator/dashboard');

    console.log('\n=============================================================');
    console.log(`TOTAL ENDPOINTS TESTED: ${results.length}`);
    console.log(`SUCCESSFUL:             ${results.length - failures.length}`);
    console.log(`FAILED:                 ${failures.length}`);
    console.log('=============================================================\n');

    if (failures.length > 0) {
      console.log('FAILURES SUMMARY:');
      for (const f of failures) {
        console.log(`- [${f.status}] ${f.method} ${f.path}: ${JSON.stringify(f.error)}`);
      }
    }
  } finally {
    server.close();
    await disconnectDB();
  }
}

runSmoke().catch((e) => {
  console.error('Smoke suite runner failed:', e);
  process.exit(1);
});
