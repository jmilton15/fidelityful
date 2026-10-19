-- ==============================================================================
-- FIDELITYFUL - SISTEMA DE FIDELIDAD PARA FULANO RESTO BAR (MADRID)
-- ESQUEMA COMPLETO Y MIGRACIÓN PARA SUPABASE (POSTGRESQL)
-- Proyecto: rwgcstupksblybgmpuse.supabase.co
-- ==============================================================================

-- 1. EXTENSIONES RECOMENDADAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLAS PRINCIPALES
-- ==============================================================================

-- Configuración general del sistema de puntos y multiplicadores
CREATE TABLE IF NOT EXISTS public.system_config (
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Usuarios (Clientes, Mozos y Administradores)
CREATE TABLE IF NOT EXISTS public.users (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Carta de Fulano Resto Bar
CREATE TABLE IF NOT EXISTS public.menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(30) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  image_emoji VARCHAR(10) DEFAULT '🍽️',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Historial de consumos / transacciones registradas en caja
CREATE TABLE IF NOT EXISTS public.transactions (
  id SERIAL PRIMARY KEY,
  transaction_code VARCHAR(40) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  staff_name VARCHAR(100),
  items JSONB NOT NULL,
  total_euros NUMERIC(10,2) NOT NULL,
  base_points INTEGER NOT NULL,
  level_bonus_pct INTEGER NOT NULL,
  points_earned INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Catálogo de recompensas y premios
CREATE TABLE IF NOT EXISTS public.rewards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  cost_points INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  category VARCHAR(40) DEFAULT 'consumicion',
  image_emoji VARCHAR(10) DEFAULT '🎁',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Canjes solicitados por clientes
CREATE TABLE IF NOT EXISTS public.redemptions (
  id SERIAL PRIMARY KEY,
  redemption_code VARCHAR(40) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  reward_id INTEGER REFERENCES public.rewards(id) ON DELETE CASCADE,
  points_used INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Cupones de descuento y premios por hitos (ej. 10ª visita)
CREATE TABLE IF NOT EXISTS public.coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  reward_type VARCHAR(40) NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ajustes manuales de puntos por el Administrador
CREATE TABLE IF NOT EXISTS public.point_adjustments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Órdenes sincronizadas con TPV BDP
CREATE TABLE IF NOT EXISTS public.bdp_orders (
  id SERIAL PRIMARY KEY,
  order_code VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Tickets de BDP canjeados mediante escaneo QR o visión IA
CREATE TABLE IF NOT EXISTS public.claimed_tickets (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(100) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  date_str VARCHAR(100),
  items_detected JSONB,
  points_awarded INTEGER NOT NULL,
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  transaction_code VARCHAR(100),
  source VARCHAR(50) DEFAULT 'gemini_ai',
  raw_data TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. ÍNDICES DE RENDIMIENTO E IDEMPOTENCIA
-- ==============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_bdp_orders_tx_id ON public.bdp_orders (bdp_tx_id) WHERE bdp_tx_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claimed_tickets_ticket_id ON public.claimed_tickets (ticket_id);
CREATE INDEX IF NOT EXISTS idx_claimed_tickets_user_id ON public.claimed_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON public.redemptions (user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_user_id ON public.coupons (user_id);

-- ==============================================================================
-- 4. POLÍTICAS DE ACCESO (RLS PERMISIVO PARA ANON / BACKEND)
-- ==============================================================================
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claimed_tickets ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Permissive Anon All" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Permissive Anon All" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Permissive Authenticated All" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Permissive Authenticated All" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- ==============================================================================
-- 5. SEMILLAS DE DATOS INICIALES (FULANO RESTOBAR - MADRID)
-- ==============================================================================

-- Configuración Inicial
INSERT INTO public.system_config (
  euro_to_points, multiplier_bebida, multiplier_coctel, multiplier_plato, multiplier_postre,
  birthday_bonus_points, visit_milestone, level_plata_threshold, level_plata_bonus_pct,
  level_oro_threshold, level_oro_bonus_pct, level_vip_threshold, level_vip_bonus_pct
) VALUES (
  10, 1.0, 1.5, 2.0, 1.2, 100, 10, 1000, 5, 3000, 10, 7000, 20
) ON CONFLICT DO NOTHING;

-- Usuarios de Prueba y Equipo
INSERT INTO public.users (uid, name, email, phone, birthday, points, total_spent, total_visits, level, role, avatar_url)
VALUES
('USR-ADMIN-01', 'Carlos Menéndez', 'admin@fulano.com', '+34 600 111 222', '1982-05-14', 0, 0, 0, 'VIP', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'),
('USR-STAFF-01', 'Lucía Santos', 'staff@fulano.com', '+34 611 333 444', '1995-09-22', 0, 0, 0, 'Plata', 'staff', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80'),
('USR-CLI-001', 'Sofía Morales', 'sofia@ejemplo.com', '+34 622 456 789', '1994-11-20', 3450, 345.00, 14, 'Oro', 'client', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80'),
('USR-CLI-002', 'Mateo García', 'mateo@ejemplo.com', '+34 633 987 654', '1998-04-12', 1420, 138.00, 9, 'Plata', 'client', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'),
('USR-CLI-003', 'Elena Ramos', 'elena@ejemplo.com', '+34 644 112 233', '1989-08-05', 8200, 820.00, 32, 'VIP', 'client', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80'),
('USR-CLI-004', 'David Torres', 'david@ejemplo.com', '+34 655 778 899', '1996-10-14', 450, 45.00, 3, 'Bronce', 'client', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80'),
('USR-CLI-005', 'Carmen Navarro', 'carmen@ejemplo.com', '+34 666 332 211', '2001-02-18', 120, 12.00, 1, 'Bronce', 'client', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80')
ON CONFLICT (email) DO NOTHING;

-- Menú Argentino de Fulano Resto Bar
INSERT INTO public.menu_items (name, category, price, description, image_emoji)
VALUES
-- Pizzas Porteñas
('Pizza Mozzarella', 'plato_pizza', 16.50, 'Masa artesanal alta al molde, abundante mozzarella, orégano y aceitunas verdes.', '🍕'),
('Pizza Calabresa', 'plato_pizza', 16.90, 'Mozzarella fundida, rodajas de longaniza calabresa picante y orégano.', '🍕'),
('Pizza Napolitana', 'plato_pizza', 16.90, 'Mozzarella, rodajas de tomate natural fresco, ajo picado y hojas de albahaca.', '🍕'),
('Pizza Fugazzeta Argentina', 'plato_pizza', 17.90, 'Clásica porteña: abundante cebolla caramelizada crujiente, mozzarella y parmesano.', '🍕'),
('Pizza Rúcula, Cherry y Jamón Serrano', 'plato_pizza', 18.90, 'Mozzarella, rúcula fresca seleccionada, tomates cherry confitados y lascas de jamón.', '🍕'),

-- Parrillada y Asado
('Provoleta a la Parrilla', 'plato_asado', 11.90, 'Queso provolone fundido al hierro con orégano fresco, ají molido y aceite de oliva.', '🧀'),
('Tira de Asado Argentino', 'plato_asado', 18.99, 'Corte clásico con hueso a la brasa, jugoso y tierno al estilo de las pampas.', '🥩'),
('Vacío de Ternera a la Brasa', 'plato_asado', 21.99, 'Corte fibroso y jugoso cocinado a fuego lento con su grasita dorada.', '🥩'),
('Entraña de Ternera Premium', 'plato_asado', 22.99, 'La reina de la parrilla argentina, tierna, sabrosa y en su punto.', '🥩'),
('Gran Parrillada de Carne (1.500g)', 'plato_asado', 60.00, 'Para compartir: asado, vacío, entraña, chorizo, morcilla y guarnición de patatas.', '🍖'),
('Patatas Bravas / Alioli', 'plato_asado', 12.90, 'Patatas rústicas crujientes con salsa brava casera y alioli suave.', '🍟'),
('Huevos Rotos con Jamón', 'plato_asado', 14.50, 'Huevos camperos estrellados sobre cama de patatas fritas y jamón ibérico.', '🍳'),
('Ración de Tequeños Artesanales', 'plato_asado', 13.90, 'Dedos crujientes rellenos de queso llanero fundido con salsa tártara y dulce.', '🥟'),

-- Encantos de Córdoba
('Choripán Argentino Clásico', 'plato_cordoba', 12.90, 'Chorizo criollo a la brasa en pan crujiente con chimichurri casero y salsa criolla.', '🌭'),
('Hamburguesa Fulano (200g)', 'plato_cordoba', 18.90, 'Carne de ternera 100%, queso cheddar, bacon ahumado, cebolla y huevo frito.', '🍔'),
('Sánguche de Milanesa Completo', 'plato_cordoba', 19.90, 'Milanesa de ternera crujiente, lechuga fresca, tomate, mayonesa casera y huevo.', '🥪'),
('Lomito Cordobés Completo', 'plato_cordoba', 22.99, 'El rey cordobés: filete de lomo de ternera tierno, jamón, queso, lechuga, tomate y huevo.', '🥪'),
('Ñoquis Caseros de la Abuela', 'plato_cordoba', 14.00, 'Ñoquis de patata elaborados a mano con salsa bolognesa o cuatro quesos.', '🍝'),
('Spaguettis al Filetto o Pesto', 'plato_cordoba', 14.50, 'Pasta italiana al dente con salsa de tomate confitado, albahaca y parmesano.', '🍝'),
('Ravioles Caseros de Carne', 'plato_cordoba', 16.00, 'Pasta rellena artesana de ternera braseada con salsa de setas y nata trufada.', '🥟'),
('Lasagna de Carne Gratinada', 'plato_cordoba', 17.50, 'Capas de pasta casera, ragú de ternera, bechamel cremosa y gratinado crujiente.', '🥘'),

-- Milangas XXL Especialidad
('Milanesa a Caballo XXL', 'plato_milanga', 30.00, 'Tamaño gigante para compartir, coronada con dos huevos fritos camperos y patatas.', '🥩'),
('Milanesa Napolitana XXL', 'plato_milanga', 31.00, 'Gigante con salsa de tomate casera, jamón cocido, mozzarella gratinada y orégano.', '🥩'),
('Milanesa Fugazzeta XXL', 'plato_milanga', 31.50, 'Cubierta con manto de cebollas caramelizadas, mozzarella y queso provolone.', '🥩'),
('Mila HDP de la Casa', 'plato_milanga', 31.50, 'Especialidad picante y potente: cheddar fundido, bacon crujiente, jalapeños y barbacoa.', '🥩'),
('Mila La Morocha', 'plato_milanga', 32.00, 'Especial con cebolla morada confitada, queso de cabra fundido y reducción de Malbec.', '🥩'),
('Mila Banquete del Pueblo', 'plato_milanga', 32.00, 'La más completa: 4 quesos fundidos, panceta crujiente, pimientos asados y huevos.', '🥩'),
('Milanesa de Ternera Napolitana Individual', 'plato_milanga', 18.90, 'Versión individual con jamón cocido, salsa de tomate y mozzarella dorada.', '🥩'),
('Milanesa de Berenjena Napolitana Individual', 'plato_milanga', 18.50, 'Opción vegetariana: berenjena rebozada crujiente, salsa pomodoro y queso fundido.', '🍆'),

-- 13 Empanadas Argentinas (4,00 € c/u)
('Empanada Ternera Suave', 'plato_empanada', 4.00, 'Relleno criollo de ternera cortada a cuchillo, cebolla de verdeo y huevo.', '🥟'),
('Empanada Ternera Picante', 'plato_empanada', 4.00, 'Ternera seleccionada con toque de ají pimentón ahumado y guindilla.', '🥟'),
('Empanada Ternera Dulce', 'plato_empanada', 4.00, 'Receta tradicional con pasas sultanas, aceitunas y especias dulces.', '🥟'),
('Empanada de Pollo', 'plato_empanada', 4.00, 'Pechuga desmenuzada jugosa con pimientos tricolor y cebolla pochada.', '🥟'),
('Empanada Espinaca y Mozzarella', 'plato_empanada', 4.00, 'Espinacas tiernas a la crema con abundante queso mozzarella.', '🥟'),
('Empanada Jamón y Mozzarella', 'plato_empanada', 4.00, 'Clásica combinación de jamón cocido seleccionado y queso derretido.', '🥟'),
('Empanada de Humita', 'plato_empanada', 4.00, 'Maíz dulce cremoso, cebolla caramelizada, pimentón y queso fundido.', '🥟'),
('Empanada Cuatro Quesos', 'plato_empanada', 4.00, 'Mezcla gourmet de mozzarella, provolone, azul y parmesano.', '🥟'),

-- Bebidas & Vinos
('Fernet Branca con Coca Cola', 'bebida_coctel', 8.50, 'El trago nacional argentino servido en vaso alto con hielo y golpe de gas.', '🥃'),
('Cerveza Quilmes Clásica', 'bebida', 3.90, 'Cerveza rubia lager argentina, fresca, suave y equilibrada.', '🍺'),
('Caña Mahou 5 Estrellas', 'bebida', 2.80, 'Cerveza de grifo madrileña bien tirada y fría.', '🍺'),
('Copa Vino Malbec Argentino', 'bebida_coctel', 4.50, 'Copa de vino tinto de Mendoza, notas de frutos rojos y cuerpo suave.', '🍷'),
('Botella Vino Malbec Reserva', 'bebida_coctel', 22.00, 'Botella de bodega mendocina seleccionada, ideal para el asado.', '🍾'),
('Refresco / Agua Mineral', 'bebida', 2.70, 'Coca-Cola, Fanta, Sprite o agua mineral con/sin gas.', '🥤'),

-- Postres Porteños
('Panqueque con Dulce de Leche', 'postre', 6.50, 'Crepe tibio recién hecho relleno de abundante dulce de leche argentino.', '🥞'),
('Flan Casero con Mixto (Dulce y Nata)', 'postre', 5.50, 'Flan de huevo tradicional de la abuela servido con dulce de leche y nata montada.', '🍮'),
('Chocotorta Porteña Casera', 'postre', 6.00, 'Tarta típica con galletitas de chocolate Chocolinas, dulce de leche y queso crema.', '🍰')
ON CONFLICT DO NOTHING;

-- Catálogo de Premios
INSERT INTO public.rewards (name, description, cost_points, stock, active, category, image_emoji)
VALUES
('Caña de Cerveza o Copa de Vino', 'Canjea por una caña bien fría o una copa de vino de la casa.', 150, 45, TRUE, 'consumicion', '🍺'),
('Ración de Croquetas Caseras', '6 unidades de nuestras famosas croquetas de jamón de bellota.', 300, 25, TRUE, 'consumicion', '🥟'),
('Cóctel Especial del Bartender', 'Cualquier cóctel clásico o de autor de nuestra carta de noche.', 450, 20, TRUE, 'consumicion', '🍸'),
('Hamburguesa Ibérica Fulano', 'Hamburguesa completa con patatas y salsa especial de la casa.', 750, 15, TRUE, 'consumicion', '🍔'),
('Camiseta Exclusiva Fulano Madrid', 'Camiseta de algodón orgánico serigrafiada edición limitada.', 1200, 10, TRUE, 'merchandising', '👕'),
('Cena Degustación para 2 Personas', 'Menú completo de 4 pases con maridaje de vinos y cócteles.', 4000, 4, TRUE, 'experiencia', '✨')
ON CONFLICT DO NOTHING;

-- Cupón de Bienvenida y Premios
INSERT INTO public.coupons (code, user_id, title, description, reward_type, is_used)
VALUES
('SORPRESA-10V-8821', 3, '🎉 Premio 10ª Visita: Cóctel de Bienvenida', '¡Felicidades por tus 10 visitas en Fulano Restobar! Tienes un cóctel de la casa de regalo.', 'free_cocktail', FALSE)
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- 8. SINCRONIZACIÓN AUTOMÁTICA ENTRE AUTH.USERS Y PUBLIC.USERS (DISPARADOR/TRIGGER)
-- ==============================================================================
-- Cuando un usuario se registra o es creado en Supabase Authentication (auth.users),
-- este trigger inserta o actualiza automáticamente el registro correspondiente en public.users.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_uid TEXT;
  v_name TEXT;
  v_phone TEXT;
  v_role TEXT;
  v_avatar TEXT;
BEGIN
  -- Extraer o generar datos desde los metadatos de Auth
  v_uid := COALESCE(
    NEW.raw_user_meta_data->>'uid',
    'USR-CLI-' || UPPER(SUBSTRING(MD5(NEW.id::text || CLOCK_TIMESTAMP()::text) FROM 1 FOR 6))
  );

  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone,
    NULL
  );

  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'client'
  );

  v_avatar := 'https://api.dicebear.com/7.x/bottts/svg?seed=' || ENCODE(DIGEST(NEW.email, 'sha256'), 'hex');

  -- Insertar en public.users garantizando que no falle si ya existe por email
  INSERT INTO public.users (
    uid,
    name,
    email,
    phone,
    points,
    total_spent,
    total_visits,
    level,
    role,
    avatar_url,
    created_at
  )
  VALUES (
    v_uid,
    v_name,
    NEW.email,
    v_phone,
    0,
    0,
    0,
    'Bronce',
    v_role,
    v_avatar,
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    name = CASE 
      WHEN public.users.name IS NULL OR public.users.name = '' OR public.users.name = SPLIT_PART(NEW.email, '@', 1)
      THEN EXCLUDED.name 
      ELSE public.users.name 
    END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asociar el trigger a la tabla interna auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- 9. FUNCIÓN AUTOMÁTICA DE BONO DE CUMPLEAÑOS (SUPABASE RPC)
-- ==============================================================================
-- Verifica que el cliente se encuentre en la semana/mes de su cumpleaños y le acredita
-- automáticamente un bono de cortesía (+150 puntos) con protección contra doble canje anual.

CREATE OR REPLACE FUNCTION public.claim_birthday_bonus(user_identifier text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record public.users%ROWTYPE;
  current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
  user_bdate DATE;
  bonus_pts INT := 150;
BEGIN
  -- Buscar usuario por uid o email
  SELECT * INTO user_record 
  FROM public.users 
  WHERE uid = user_identifier OR email = user_identifier
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Usuario no encontrado en Fulano Resto Bar.');
  END IF;

  -- Verificar si tiene fecha de nacimiento registrada
  IF user_record.birthday IS NULL OR TRIM(user_record.birthday) = '' THEN
    RETURN json_build_object('success', false, 'message', 'No hay fecha de cumpleaños registrada para este usuario.');
  END IF;

  -- Convertir de forma segura el texto YYYY-MM-DD a DATE
  BEGIN
    user_bdate := user_record.birthday::date;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'El formato de fecha de cumpleaños no es válido.');
  END;

  -- Validar si es la semana o mes de cumpleaños (mismo mes o margen de 7 días)
  IF EXTRACT(MONTH FROM CURRENT_DATE) != EXTRACT(MONTH FROM user_bdate) AND
     ABS(EXTRACT(DAY FROM CURRENT_DATE) - EXTRACT(DAY FROM user_bdate)) > 7 THEN
    RETURN json_build_object('success', false, 'message', 'Aún no estás en la semana de tu cumpleaños.');
  END IF;

  -- Evitar doble beneficio en el mismo año
  IF user_record.birthday_bonus_year = current_year OR EXISTS (
    SELECT 1 FROM public.point_adjustments 
    WHERE user_id = user_record.id 
    AND reason ILIKE '%Cumpleaños%' 
    AND EXTRACT(YEAR FROM created_at) = current_year
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Ya has reclamado tu bono de cumpleaños este año (' || current_year || ').');
  END IF;

  -- Obtener puntos configurados en system_config si existen
  SELECT COALESCE(birthday_bonus_points, 150) INTO bonus_pts
  FROM public.system_config
  ORDER BY id DESC LIMIT 1;
  IF bonus_pts IS NULL THEN
    bonus_pts := 150;
  END IF;

  -- Acreditar los puntos de regalo
  UPDATE public.users
  SET points = points + bonus_pts,
      birthday_bonus_year = current_year
  WHERE id = user_record.id;

  -- Registrar en la tabla de ajustes de puntos
  INSERT INTO public.point_adjustments (user_id, amount, reason)
  VALUES (user_record.id, bonus_pts, '🎂 Regalo automático de Cumpleaños (' || current_year || ') - Fulano Resto Bar');

  RETURN json_build_object(
    'success', true, 
    'message', '¡Feliz cumpleaños! Se han acreditado +' || bonus_pts || ' puntos de regalo a tu cuenta de Fulano Resto Bar.',
    'bonus_points', bonus_pts,
    'new_total_points', user_record.points + bonus_pts
  );
END;
$$;

-- Sobrecarga para aceptar UUID directamente (auth.uid())
CREATE OR REPLACE FUNCTION public.claim_birthday_bonus(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.claim_birthday_bonus(user_uuid::text);
END;
$$;

