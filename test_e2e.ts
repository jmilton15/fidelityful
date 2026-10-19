// Comprehensive end-to-end integration test runner
const BASE = 'http://localhost:3000/api';

async function req(url: string, options: any = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🚀 Iniciando Suite de Pruebas Exhaustivas de Fidelidad Fulano Restobar...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. SYSTEM & CONFIG HEALTH
  console.log('\n--- 1. Pruebas de Sistema, Info y Configuración ---');
  const appInfo = await req(`${BASE}/app-info`);
  assert(appInfo.ok && !!appInfo.data.appUrl, 'GET /api/app-info retorna appUrl válido');

  const config = await req(`${BASE}/config`);
  assert(config.ok && typeof config.data.euro_to_points === 'number', `GET /api/config devuelve euro_to_points = ${config.data?.euro_to_points}`);

  const menu = await req(`${BASE}/menu`);
  assert(menu.ok && Array.isArray(menu.data) && menu.data.length > 0, `GET /api/menu devuelve ${menu.data?.length} productos del bar`);

  // 2. CLIENT MANAGEMENT & CRUD
  console.log('\n--- 2. Pruebas de Panel de Cliente & Usuarios ---');
  const testEmail = `test_${Date.now()}@fulano.com`;
  const newUser = await req(`${BASE}/users`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Cliente Prueba E2E',
      email: testEmail,
      phone: '+34 600 112 233',
      birthday: '1995-10-14'
    })
  });
  assert(newUser.ok && newUser.data.id && newUser.data.uid, `POST /api/users crea cliente correctamente (${newUser.data?.uid})`);

  const clientUid = newUser.data?.uid;
  const clientId = newUser.data?.id;

  const getUser = await req(`${BASE}/users/${clientUid}`);
  const userFromUid = getUser.data?.user;
  assert(getUser.ok && userFromUid?.email === testEmail, `GET /api/users/:uid recupera cliente por UID`);

  const getUserById = await req(`${BASE}/users/${clientId}`);
  const userFromId = getUserById.data?.user;
  assert(getUserById.ok && userFromId?.email === testEmail, `GET /api/users/:id recupera cliente por ID numérico`);

  // 3. TPV / POS TRANSACTION & POINT ACCRUAL
  console.log('\n--- 3. Pruebas de TPV / POS (Acumulación y Niveles) ---');
  // Consumo de 120€ en Fulano Restobar -> 1200 puntos (Nivel Plata alcanzado)
  const tx = await req(`${BASE}/transactions`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: clientId,
      amount: 120,
      description: 'Cena tapas y cócteles Fulano'
    })
  });
  assert(tx.ok && tx.data.points_earned === 1200, `POST /api/transactions calcula 1200 pts para 120€ (ganados: ${tx.data?.points_earned})`);

  const updatedUserRes = await req(`${BASE}/users/${clientId}`);
  const updatedUser = updatedUserRes.data?.user;
  assert(updatedUser?.points === 1200, `El cliente tiene 1200 puntos acreditados por la compra (actual: ${updatedUser?.points})`);
  assert(updatedUser?.level === 'Plata', `El cliente ascendió automáticamente a nivel Plata (actual: ${updatedUser?.level})`);

  // 4. CUMPLEAÑOS & BONOS
  console.log('\n--- 4. Pruebas de Bonificación de Cumpleaños ---');
  // Reclamar bono de cumpleaños
  const bdayRes = await req(`${BASE}/users/${clientId}/birthday-bonus`, {
    method: 'POST'
  });
  assert(bdayRes.ok && bdayRes.data.success, `POST /api/users/:id/birthday-bonus otorga bono: ${bdayRes.data?.message}`);

  // Reintento de bono de cumpleaños (debe rechazar para evitar duplicados en el mismo año)
  const bdayDuplicate = await req(`${BASE}/users/${clientId}/birthday-bonus`, {
    method: 'POST'
  });
  assert(bdayDuplicate.status === 400 && !bdayDuplicate.data.success, `Prevención de doble bono en el mismo año funciona (rechazado correctamente)`);

  // 5. CATALOGO DE RECOMPENSAS & CANJES (CLIENTE + ADMIN)
  console.log('\n--- 5. Pruebas de Catálogo de Recompensas & Canjes ---');
  const rewardsList = await req(`${BASE}/rewards`);
  assert(rewardsList.ok && Array.isArray(rewardsList.data), `GET /api/rewards lista ${rewardsList.data?.length} recompensas`);

  // Crear recompensa de prueba
  const newReward = await req(`${BASE}/rewards`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Postre Casero Fulano Test',
      description: 'Tarta de queso fluida',
      points_cost: 300,
      category: 'postres',
      icon: 'Cake',
      stock: 5
    })
  });
  assert(newReward.ok && newReward.data?.id, `POST /api/rewards crea nueva recompensa correctamente (ID: ${newReward.data?.id})`);
  const rewardId = newReward.data?.id;

  // Cliente canjea la recompensa
  const userBeforeRedeem = (await req(`${BASE}/users/${clientId}`)).data?.user;
  const ptsBefore = userBeforeRedeem.points;

  const redeem = await req(`${BASE}/redemptions`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: clientId,
      reward_id: rewardId
    })
  });
  assert(redeem.ok && !!redeem.data?.code, `POST /api/redemptions genera código QR de canje: ${redeem.data?.code}`);
  const redemptionCode = redeem.data?.code;

  const userAfterRedeem = (await req(`${BASE}/users/${clientId}`)).data?.user;
  assert(userAfterRedeem.points === ptsBefore - 300, `Puntos deducidos correctamente (-300 pts) tras el canje (${ptsBefore} -> ${userAfterRedeem.points})`);

  // TPV / Staff valida y entrega el premio usando el código
  const claimRedeem = await req(`${BASE}/redemptions/${redemptionCode}/claim`, {
    method: 'POST'
  });
  assert(claimRedeem.ok && claimRedeem.data?.success, `POST /api/redemptions/:code/claim validado y entregado por TPV`);

  // Reintento de canjear el mismo código ya usado (debe ser rechazado)
  const reClaimRedeem = await req(`${BASE}/redemptions/${redemptionCode}/claim`, {
    method: 'POST'
  });
  assert(reClaimRedeem.status === 400, `Código ya utilizado es rechazado por el TPV con seguridad`);

  // Admin elimina permanentemente la recompensa creada para el test
  const delReward = await req(`${BASE}/rewards/${rewardId}?permanent=true`, {
    method: 'DELETE'
  });
  assert(delReward.ok, `DELETE /api/rewards/:id?permanent=true limpia la recompensa de prueba`);

  // 6. ANALYTICS & RESUMEN DE NEGOCIO (ADMIN)
  console.log('\n--- 6. Pruebas de Panel de Métricas / Analytics ---');
  const analytics = await req(`${BASE}/analytics`);
  assert(analytics.ok && analytics.data?.users?.total_users !== undefined, `GET /api/analytics devuelve métricas consolidadas (Usuarios: ${analytics.data?.users?.total_users}, Facturado: ${analytics.data?.transactions?.total_billed}€)`);

  // 7. BDP TPV ORDER & SIMULATION
  console.log('\n--- 7. Pruebas de Pasarela BDP TPV & Tickets ---');
  const bdpOrder = await req(`${BASE}/bdp/create-order`, {
    method: 'POST',
    body: JSON.stringify({
      userId: clientId,
      tableNumber: 'Mesa 4',
      items: [
        { id: 1, name: 'Empanada Criolla', price: 4.0, quantity: 2, category: 'plato_empanada' },
        { id: 2, name: 'Fernet Branca con Cola', price: 9.0, quantity: 1, category: 'bebidas' }
      ]
    })
  });
  assert(bdpOrder.ok && !!bdpOrder.data?.order?.order_code, `POST /api/bdp/create-order crea comanda BDP (${bdpOrder.data?.order?.order_code})`);

  // RESUMEN FINAL
  console.log('\n==================================================');
  console.log(`TOTAL PRUEBAS: ${passed + failed} | APROBADAS: ${passed} | FALLIDAS: ${failed}`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Error fatal durante la prueba:', err);
  process.exit(1);
});
