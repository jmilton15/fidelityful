import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';

let pgliteInstance: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

export async function getDb(): Promise<PGlite> {
  if (pgliteInstance) {
    return pgliteInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const dataDir = path.resolve(process.cwd(), 'data/pgdata');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Clean up stale postmaster.pid if present (e.g. from container restart or ungraceful exit)
    const pidFile = path.join(dataDir, 'postmaster.pid');
    if (fs.existsSync(pidFile)) {
      try {
        fs.unlinkSync(pidFile);
      } catch {
        // ignore
      }
    }

    // Detect if data directory is corrupted (e.g., PG_VERSION exists but postgresql.conf is missing)
    const confFile = path.join(dataDir, 'postgresql.conf');
    const versionFile = path.join(dataDir, 'PG_VERSION');
    if (fs.existsSync(versionFile) && !fs.existsSync(confFile)) {
      console.warn('Incomplete PGlite cluster detected, resetting directory for clean startup...');
      try {
        fs.rmSync(dataDir, { recursive: true, force: true });
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (rmErr) {
        console.warn('Could not reset dataDir:', rmErr);
      }
    }

    try {
      const db = new PGlite(dataDir);
      await db.waitReady;
      await initSchemaAndSeeds(db);
      pgliteInstance = db;
      return db;
    } catch (err) {
      console.warn('Persistent PGlite encountered an issue, attempting automatic clean recovery:', err);
      try {
        if (fs.existsSync(dataDir)) {
          fs.rmSync(dataDir, { recursive: true, force: true });
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const freshDb = new PGlite(dataDir);
        await freshDb.waitReady;
        await initSchemaAndSeeds(freshDb);
        pgliteInstance = freshDb;
        return freshDb;
      } catch (recoveryErr) {
        console.warn('Clean persistent initialization failed, falling back to in-memory instance:', recoveryErr);
        const memDb = new PGlite();
        await memDb.waitReady;
        await initSchemaAndSeeds(memDb);
        pgliteInstance = memDb;
        return memDb;
      }
    }
  })();

  return initPromise;
}

async function initSchemaAndSeeds(db: PGlite) {
  // Create tables using exec for multi-statement DDL
  await db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      id SERIAL PRIMARY KEY,
      euro_to_points INTEGER NOT NULL DEFAULT 10,
      multiplier_bebida NUMERIC(3,2) NOT NULL DEFAULT 1.0,
      multiplier_coctel NUMERIC(3,2) NOT NULL DEFAULT 1.5,
      multiplier_plato NUMERIC(3,2) NOT NULL DEFAULT 2.0,
      multiplier_postre NUMERIC(3,2) NOT NULL DEFAULT 1.2,
      birthday_bonus_points INTEGER NOT NULL DEFAULT 100,
      visit_milestone INTEGER NOT NULL DEFAULT 10,
      level_plata_threshold INTEGER NOT NULL DEFAULT 1000,
      level_plata_bonus_pct INTEGER NOT NULL DEFAULT 5,
      level_oro_threshold INTEGER NOT NULL DEFAULT 3000,
      level_oro_bonus_pct INTEGER NOT NULL DEFAULT 10,
      level_vip_threshold INTEGER NOT NULL DEFAULT 7000,
      level_vip_bonus_pct INTEGER NOT NULL DEFAULT 20,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      uid VARCHAR(64) UNIQUE NOT NULL,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) UNIQUE NOT NULL,
      phone VARCHAR(40),
      birthday VARCHAR(20),
      points INTEGER NOT NULL DEFAULT 0,
      total_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_visits INTEGER NOT NULL DEFAULT 0,
      level VARCHAR(20) NOT NULL DEFAULT 'Bronce',
      role VARCHAR(20) NOT NULL DEFAULT 'client',
      birthday_bonus_year INTEGER DEFAULT NULL,
      avatar_url TEXT,
      last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      category VARCHAR(30) NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      description TEXT,
      image_emoji VARCHAR(10) DEFAULT '🍽️',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      transaction_code VARCHAR(40) UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      staff_name VARCHAR(100),
      items JSONB NOT NULL,
      total_euros NUMERIC(10,2) NOT NULL,
      base_points INTEGER NOT NULL,
      level_bonus_pct INTEGER NOT NULL,
      points_earned INTEGER NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description TEXT,
      cost_points INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 10,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      category VARCHAR(40) DEFAULT 'consumicion',
      image_emoji VARCHAR(10) DEFAULT '🎁',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS redemptions (
      id SERIAL PRIMARY KEY,
      redemption_code VARCHAR(40) UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      reward_id INTEGER REFERENCES rewards(id),
      points_used INTEGER NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      claimed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code VARCHAR(40) UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      title VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      reward_type VARCHAR(40) NOT NULL,
      is_used BOOLEAN DEFAULT FALSE,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS point_adjustments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      admin_id INTEGER REFERENCES users(id),
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bdp_orders (
      id SERIAL PRIMARY KEY,
      order_code VARCHAR(50) UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      table_number VARCHAR(50) NOT NULL DEFAULT 'Mesa 4',
      total_amount NUMERIC(10,2) NOT NULL,
      terrace_service BOOLEAN NOT NULL DEFAULT FALSE,
      discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      coupon_code VARCHAR(50),
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      payment_method VARCHAR(30) NOT NULL DEFAULT 'tpv_qr',
      items JSONB NOT NULL,
      qr_code_data TEXT,
      pay_url TEXT,
      points_preview INTEGER NOT NULL DEFAULT 0,
      bdp_tx_id VARCHAR(100),
      webhook_payload JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_bdp_orders_tx_id ON bdp_orders (bdp_tx_id) WHERE bdp_tx_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS claimed_tickets (
      id SERIAL PRIMARY KEY,
      ticket_id VARCHAR(100) UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      amount NUMERIC(10,2) NOT NULL,
      date_str VARCHAR(100),
      items_detected JSONB,
      points_awarded INTEGER NOT NULL,
      multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
      transaction_code VARCHAR(100),
      source VARCHAR(50) DEFAULT 'gemini_ai',
      raw_data TEXT,
      claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_claimed_tickets_ticket_id ON claimed_tickets (ticket_id);
    CREATE INDEX IF NOT EXISTS idx_claimed_tickets_user_id ON claimed_tickets (user_id);
  `);

  // Ensure columns exist if table was already created
  try {
    await db.exec(`
      ALTER TABLE bdp_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE bdp_orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bdp_orders_tx_id ON bdp_orders (bdp_tx_id) WHERE bdp_tx_id IS NOT NULL;
      
      CREATE TABLE IF NOT EXISTS claimed_tickets (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(100) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        amount NUMERIC(10,2) NOT NULL,
        date_str VARCHAR(100),
        items_detected JSONB,
        points_awarded INTEGER NOT NULL,
        multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
        transaction_code VARCHAR(100),
        source VARCHAR(50) DEFAULT 'gemini_ai',
        raw_data TEXT,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_claimed_tickets_ticket_id ON claimed_tickets (ticket_id);
      CREATE INDEX IF NOT EXISTS idx_claimed_tickets_user_id ON claimed_tickets (user_id);
    `);

    // Calibración económica del catálogo de recompensas (Retorno 5% - 6% real)
    await db.exec(`
      UPDATE rewards SET cost_points = 500 WHERE name LIKE '%Caña%' AND cost_points != 500;
      UPDATE rewards SET cost_points = 1550 WHERE name LIKE '%Croquetas%' AND cost_points != 1550;
      UPDATE rewards SET cost_points = 2000 WHERE name LIKE '%Cóctel%' AND cost_points != 2000;
      UPDATE rewards SET cost_points = 2650 WHERE name LIKE '%Hamburguesa%' AND cost_points != 2650;
      UPDATE rewards SET cost_points = 3500 WHERE name LIKE '%Camiseta%' AND cost_points != 3500;
      UPDATE rewards SET cost_points = 13600 WHERE name LIKE '%Cena%' AND cost_points != 13600;
    `);

    // Asegurar que la empanada criolla esté en el catálogo de premios
    const empCheck = await db.query("SELECT COUNT(*) as count FROM rewards WHERE name LIKE '%Empanada%';");
    if (parseInt((empCheck.rows[0] as any)?.count || '0', 10) === 0) {
      await db.query(`
        INSERT INTO rewards (name, description, cost_points, stock, active, category, image_emoji)
        VALUES ('Empanada Criolla Fulano (Artesanal)', 'Cualquiera de nuestras 13 variedades de empanadas argentinas artesanas recién horneadas.', 720, 50, TRUE, 'consumicion', '🥟');
      `);
    }
  } catch (_e) {
    // Ignore if already applied
  }

  // Check if system_config exists
  const configRes = await db.query('SELECT COUNT(*) as count FROM system_config;');
  const configCount = parseInt((configRes.rows[0] as any)?.count || '0', 10);
  if (configCount === 0) {
    await db.query(`
      INSERT INTO system_config (
        euro_to_points,
        multiplier_bebida,
        multiplier_coctel,
        multiplier_plato,
        multiplier_postre,
        birthday_bonus_points,
        visit_milestone,
        level_plata_threshold,
        level_plata_bonus_pct,
        level_oro_threshold,
        level_oro_bonus_pct,
        level_vip_threshold,
        level_vip_bonus_pct
      ) VALUES (
        10, 1.0, 1.5, 2.0, 1.2, 150, 10, 1000, 5, 3000, 10, 7000, 20
      );
    `);
  } else {
    // Si la configuración previa tenía 100 pts, actualizar al nuevo estándar de 150 pts de cortesía
    await db.query(`UPDATE system_config SET birthday_bonus_points = 150 WHERE birthday_bonus_points = 100;`);
  }

  // Check if users exist
  const usersRes = await db.query('SELECT COUNT(*) as count FROM users;');
  const usersCount = parseInt((usersRes.rows[0] as any)?.count || '0', 10);
  if (usersCount === 0) {
    // Seed Admin, Staff, and 5 Clients
    await db.query(`
      INSERT INTO users (uid, name, email, phone, birthday, points, total_spent, total_visits, level, role, avatar_url)
      VALUES
      ('USR-ADMIN-01', 'Carlos Menéndez', 'admin@fulano.com', '+34 600 111 222', '1982-05-14', 0, 0, 0, 'VIP', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'),
      ('USR-STAFF-01', 'Lucía Santos', 'staff@fulano.com', '+34 611 333 444', '1995-09-22', 0, 0, 0, 'Plata', 'staff', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80'),
      ('USR-CLI-001', 'Sofía Morales', 'sofia@ejemplo.com', '+34 622 456 789', '1994-11-20', 3450, 345.00, 14, 'Oro', 'client', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80'),
      ('USR-CLI-002', 'Mateo García', 'mateo@ejemplo.com', '+34 633 987 654', '1998-04-12', 1420, 138.00, 9, 'Plata', 'client', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'),
      ('USR-CLI-003', 'Elena Ramos', 'elena@ejemplo.com', '+34 644 112 233', '1989-08-05', 8200, 820.00, 32, 'VIP', 'client', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80'),
      ('USR-CLI-004', 'David Torres', 'david@ejemplo.com', '+34 655 778 899', '1996-10-14', 450, 45.00, 3, 'Bronce', 'client', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80'),
      ('USR-CLI-005', 'Carmen Navarro', 'carmen@ejemplo.com', '+34 666 332 211', '2001-02-18', 120, 12.00, 1, 'Bronce', 'client', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80');
    `);

    // Seed Menu Items
    await db.query(`
      INSERT INTO menu_items (name, category, price, description, image_emoji)
      VALUES
      ('Caña Mahou 5 Estrellas', 'bebida', 2.50, 'Cerveza rubia de grifo clásica madrileña, fresca y bien tirada.', '🍺'),
      ('Doble Artesanal IPA Madrileña', 'bebida', 3.90, 'Cerveza artesanal de lúpulo aromático y cuerpo dorado.', '🍻'),
      ('Refresco / Agua de Manantial', 'bebida', 2.70, 'Botella de agua mineral de Solán o refrescos premium.', '🥤'),
      ('Café de Especialidad Arábica', 'bebida', 2.00, 'Café recién molido de tueste natural con leche fresca o vegetal.', '☕'),
      ('Cóctel Mojito Clásico', 'bebida_coctel', 8.50, 'Ron añejo, hierbabuena fresca, lima natural y azúcar de caña.', '🍹'),
      ('Cóctel Fulano Aperol Spritz', 'bebida_coctel', 8.00, 'Aperol, cava brut reserva, soda y rodaja de naranja sanguina.', '🥂'),
      ('Gin Tonic Premium Fulano', 'bebida_coctel', 10.50, 'Ginebra botánica premium con tónica Fever-Tree y enebro.', '🍸'),
      ('Patatas Bravas Ahumadas Fulano', 'plato', 6.80, 'Patata agria crujiente con salsa brava casera y alioli de ajo asado.', '🍟'),
      ('Sándwich Brioche Pastrami New York', 'plato', 9.50, 'Pan brioche tostado con pastrami curado, pepinillos y mostaza dulce.', '🥪'),
      ('Hamburguesa Ibérica Fulano Gourmet', 'plato', 13.90, '200g de carne madurada, queso manchego curado y cebolla caramelizada.', '🍔'),
      ('Tarta de Queso Fluida Estilo Madrid', 'postre', 5.80, 'Horneada al momento con corazón cremoso y base de galleta artesana.', '🍰'),
      ('Coulant de Chocolate Belga 70%', 'postre', 6.20, 'Bizcocho tibio de cacao puro con helado artesano de vainilla Bourbon.', '🍨');
    `);

    // Seed Rewards
    await db.query(`
      INSERT INTO rewards (name, description, cost_points, stock, active, category, image_emoji)
      VALUES
      ('Caña de Cerveza o Copa de Vino', 'Canjea por una caña bien fría o una copa de vino de la casa.', 500, 45, TRUE, 'consumicion', '🍺'),
      ('Empanada Criolla Fulano (Artesanal)', 'Cualquiera de nuestras 13 variedades de empanadas argentinas artesanas recién horneadas.', 720, 50, TRUE, 'consumicion', '🥟'),
      ('Ración de Croquetas Caseras', '6 unidades de nuestras famosas croquetas de jamón de bellota.', 1550, 25, TRUE, 'consumicion', '🥟'),
      ('Cóctel Especial del Bartender', 'Cualquier cóctel clásico o de autor de nuestra carta de noche.', 2000, 20, TRUE, 'consumicion', '🍸'),
      ('Hamburguesa Ibérica Fulano', 'Hamburguesa completa con patatas y salsa especial de la casa.', 2650, 15, TRUE, 'consumicion', '🍔'),
      ('Camiseta Exclusiva Fulano Madrid', 'Camiseta de algodón orgánico serigrafiada edición limitada.', 3500, 10, TRUE, 'merchandising', '👕'),
      ('Cena Degustación para 2 Personas', 'Menú completo de 4 pases con maridaje de vinos y cócteles.', 13600, 4, TRUE, 'experiencia', '✨');
    `);

    // Seed initial transactions
    await db.query(`
      INSERT INTO transactions (transaction_code, user_id, staff_name, items, total_euros, base_points, level_bonus_pct, points_earned, notes, created_at)
      VALUES
      ('TX-1001', 3, 'Lucía Santos', '[{"name":"Hamburguesa Ibérica Fulano Gourmet","category":"plato","price":13.90,"quantity":2,"points":556},{"name":"Gin Tonic Premium Fulano","category":"bebida_coctel","price":10.50,"quantity":2,"points":315}]', 48.80, 871, 10, 958, 'Mesa 4 - Cena de amigos', CURRENT_TIMESTAMP - INTERVAL '3 days'),
      ('TX-1002', 4, 'Lucía Santos', '[{"name":"Sándwich Brioche Pastrami New York","category":"plato","price":9.50,"quantity":1,"points":190},{"name":"Caña Mahou 5 Estrellas","category":"bebida","price":2.50,"quantity":2,"points":50}]', 14.50, 240, 5, 252, 'Barra - Almuerzo', CURRENT_TIMESTAMP - INTERVAL '2 days'),
      ('TX-1003', 5, 'Carlos Menéndez', '[{"name":"Cóctel Fulano Aperol Spritz","category":"bebida_coctel","price":8.00,"quantity":2,"points":240},{"name":"Patatas Bravas Ahumadas Fulano","category":"plato","price":6.80,"quantity":1,"points":136},{"name":"Tarta de Queso Fluida Estilo Madrid","category":"postre","price":5.80,"quantity":1,"points":70}]', 28.60, 446, 20, 535, 'Terraza VIP', CURRENT_TIMESTAMP - INTERVAL '1 day');
    `);

    // Seed sample coupon for Sofía (reached 10 visits bonus)
    await db.query(`
      INSERT INTO coupons (code, user_id, title, description, reward_type, is_used, created_at)
      VALUES
      ('SORPRESA-10V-8821', 3, '🎉 Premio 10ª Visita: Cóctel de Bienvenida', '¡Felicidades por tus 10 visitas en Fulano Restobar! Tienes un cóctel de la casa de regalo.', 'free_cocktail', FALSE, CURRENT_TIMESTAMP - INTERVAL '5 days');
    `);

    // Seed sample redemption
    await db.query(`
      INSERT INTO redemptions (redemption_code, user_id, reward_id, points_used, status, created_at)
      VALUES
      ('RDM-9941', 3, 2, 300, 'claimed', CURRENT_TIMESTAMP - INTERVAL '7 days');
    `);
  }

  // Always ensure authentic Fulano Restobar Argentine menu items exist
  await syncFulanoMenu(db);
}

async function syncFulanoMenu(db: PGlite) {
  const check = await db.query("SELECT COUNT(*) as count FROM menu_items WHERE name LIKE '%Fugazzeta%' OR name LIKE '%Provoleta%';");
  const count = parseInt((check.rows[0] as any)?.count || '0', 10);
  if (count === 0) {
    // Clear legacy placeholder items and insert official Fulano Restobar menu
    await db.query("DELETE FROM menu_items WHERE category != 'custom';");
    await db.query(`
      INSERT INTO menu_items (name, category, price, description, image_emoji)
      VALUES
      -- PIZZAS (AL ESTILO ARGENTINO)
      ('Pizza Mozzarella', 'plato_pizza', 16.50, 'Masa artesanal alta al molde, abundante mozzarella, orégano y aceitunas verdes.', '🍕'),
      ('Pizza Calabresa', 'plato_pizza', 16.90, 'Mozzarella fundida, rodajas de longaniza calabresa picante y orégano.', '🍕'),
      ('Pizza Napolitana', 'plato_pizza', 16.90, 'Mozzarella, rodajas de tomate natural fresco, ajo picado y hojas de albahaca.', '🍕'),
      ('Pizza Fugazzeta Argentina', 'plato_pizza', 17.90, 'Clásica porteña: abundante cebolla caramelizada crujiente, mozzarella y parmesano.', '🍕'),
      ('Pizza Rúcula, Cherry y Jamón Serrano', 'plato_pizza', 18.90, 'Mozzarella, rúcula fresca seleccionada, tomates cherry confitados y lascas de jamón.', '🍕'),

      -- SALE ASADITO Y LO TÍPICO!
      ('Provoleta a la Parrilla', 'plato_asado', 11.90, 'Queso provolone fundido al hierro con orégano fresco, ají molido y aceite de oliva.', '🧀'),
      ('Tira de Asado Argentino', 'plato_asado', 18.99, 'Corte clásico con hueso a la brasa, jugoso y tierno al estilo de las pampas.', '🥩'),
      ('Vacío de Ternera a la Brasa', 'plato_asado', 21.99, 'Corte fibroso y jugoso cocinado a fuego lento con su grasita dorada.', '🥩'),
      ('Entraña de Ternera Premium', 'plato_asado', 22.99, 'La reina de la parrilla argentina, tierna, sabrosa y en su punto.', '🥩'),
      ('Gran Parrillada de Carne (1.500g)', 'plato_asado', 60.00, 'Para compartir: asado, vacío, entraña, chorizo, morcilla y guarnición de patatas.', '🍖'),
      ('Patatas Bravas / Alioli', 'plato_asado', 12.90, 'Patatas rústicas crujientes con salsa brava casera y alioli suave.', '🍟'),
      ('Huevos Rotos con Jamón', 'plato_asado', 14.50, 'Huevos camperos estrellados sobre cama de patatas fritas y jamón ibérico.', '🍳'),
      ('Ración de Tequeños Artesanales', 'plato_asado', 13.90, 'Dedos crujientes rellenos de queso llanero fundido con salsa tártara y dulce.', '🥟'),

      -- ENCANTOS DE CÓRDOBA Y RECETAS DE ABUELA
      ('Choripán Argentino Clásico', 'plato_cordoba', 12.90, 'Chorizo criollo a la brasa en pan crujiente con chimichurri casero y salsa criolla.', '🌭'),
      ('Hamburguesa Fulano (200g)', 'plato_cordoba', 18.90, 'Carne de ternera 100%, queso cheddar, bacon ahumado, cebolla y huevo frito.', '🍔'),
      ('Sánguche de Milanesa Completo', 'plato_cordoba', 19.90, 'Milanesa de ternera crujiente, lechuga fresca, tomate, mayonesa casera y huevo.', '🥪'),
      ('Lomito Cordobés Completo', 'plato_cordoba', 22.99, 'El rey cordobés: filete de lomo de ternera tierno, jamón, queso, lechuga, tomate y huevo.', '🥪'),
      ('Ñoquis Caseros de la Abuela', 'plato_cordoba', 14.00, 'Ñoquis de patata elaborados a mano con salsa bolognesa o cuatro quesos.', '🍝'),
      ('Spaguettis al Filetto o Pesto', 'plato_cordoba', 14.50, 'Pasta italiana al dente con salsa de tomate confitado, albahaca y parmesano.', '🍝'),
      ('Ravioles Caseros de Carne', 'plato_cordoba', 16.00, 'Pasta rellena artesana de ternera braseada con salsa de setas y nata trufada.', '🥟'),
      ('Lasagna de Carne Gratinada', 'plato_cordoba', 17.50, 'Capas de pasta casera, ragú de ternera, bechamel cremosa y gratinado crujiente.', '🥘'),

      -- MILANGAS (LAS CLÁSICAS XXL Y ESPECIALIDAD DE CASA)
      ('Milanesa a Caballo XXL', 'plato_milanga', 30.00, 'Tamaño gigante para compartir, coronada con dos huevos fritos camperos y patatas.', '🥩'),
      ('Milanesa Napolitana XXL', 'plato_milanga', 31.00, 'Gigante con salsa de tomate casera, jamón cocido, mozzarella gratinada y orégano.', '🥩'),
      ('Milanesa Fugazzeta XXL', 'plato_milanga', 31.50, 'Cubierta con manto de cebollas caramelizadas, mozzarella y queso provolone.', '🥩'),
      ('Mila HDP de la Casa', 'plato_milanga', 31.50, 'Especialidad picante y potente: cheddar fundido, bacon crujiente, jalapeños y barbacoa.', '🥩'),
      ('Mila La Morocha', 'plato_milanga', 32.00, 'Especial con cebolla morada confitada, queso de cabra fundido y reducción de Malbec.', '🥩'),
      ('Mila Banquete del Pueblo', 'plato_milanga', 32.00, 'La más completa: 4 quesos fundidos, panceta crujiente, pimientos asados y huevos.', '🥩'),
      ('Milanesa de Ternera Napolitana Individual', 'plato_milanga', 18.90, 'Versión individual con jamón cocido, salsa de tomate y mozzarella dorada.', '🥩'),
      ('Milanesa de Berenjena Napolitana Individual', 'plato_milanga', 18.50, 'Opción vegetariana: berenjena rebozada crujiente, salsa pomodoro y queso fundido.', '🍆'),

      -- EMPANADAS ARGENTINAS (4,00 € C/U)
      ('Empanada Ternera Suave', 'plato_empanada', 4.00, 'Relleno criollo de ternera cortada a cuchillo, cebolla de verdeo y huevo.', '🥟'),
      ('Empanada Ternera Picante', 'plato_empanada', 4.00, 'Ternera seleccionada con toque de ají pimentón ahumado y guindilla.', '🥟'),
      ('Empanada Ternera Dulce', 'plato_empanada', 4.00, 'Receta tradicional con pasas sultanas, aceitunas y especias dulces.', '🥟'),
      ('Empanada de Pollo', 'plato_empanada', 4.00, 'Pechuga desmenuzada jugosa con pimientos tricolor y cebolla pochada.', '🥟'),
      ('Empanada Espinaca y Mozzarella', 'plato_empanada', 4.00, 'Espinacas tiernas a la crema con abundante queso mozzarella.', '🥟'),
      ('Empanada Jamón y Mozzarella', 'plato_empanada', 4.00, 'Clásica combinación de jamón cocido seleccionado y queso derretido.', '🥟'),
      ('Empanada de Humita', 'plato_empanada', 4.00, 'Maíz dulce cremoso, cebolla caramelizada, pimentón y queso fundido.', '🥟'),
      ('Empanada Cuatro Quesos', 'plato_empanada', 4.00, 'Mezcla gourmet de mozzarella, provolone, azul y parmesano.', '🥟'),

      -- BEBIDAS & TRAGOS TÍPICOS
      ('Fernet Branca con Coca Cola', 'bebida_coctel', 8.50, 'El trago nacional argentino servido en vaso alto con hielo y golpe de gas.', '🥃'),
      ('Cerveza Quilmes Clásica', 'bebida', 3.90, 'Cerveza rubia lager argentina, fresca, suave y equilibrada.', '🍺'),
      ('Caña Mahou 5 Estrellas', 'bebida', 2.80, 'Cerveza de grifo madrileña bien tirada y fría.', '🍺'),
      ('Copa Vino Malbec Argentino', 'bebida_coctel', 4.50, 'Copa de vino tinto de Mendoza, notas de frutos rojos y cuerpo suave.', '🍷'),
      ('Botella Vino Malbec Reserva', 'bebida_coctel', 22.00, 'Botella de bodega mendocina seleccionada, ideal para el asado.', '🍾'),
      ('Refresco / Agua Mineral', 'bebida', 2.70, 'Coca-Cola, Fanta, Sprite o agua mineral con/sin gas.', '🥤'),

      -- POSTRES TÍPICOS ARGENTINOS
      ('Panqueque con Dulce de Leche', 'postre', 6.50, 'Crepe tibio recién hecho relleno de abundante dulce de leche argentino.', '🥞'),
      ('Flan Casero con Mixto (Dulce y Nata)', 'postre', 5.50, 'Flan de huevo tradicional de la abuela servido con dulce de leche y nata montada.', '🍮'),
      ('Chocotorta Porteña Casera', 'postre', 6.00, 'Tarta típica con galletitas de chocolate Chocolinas, dulce de leche y queso crema.', '🍰');
    `);
  }
}

