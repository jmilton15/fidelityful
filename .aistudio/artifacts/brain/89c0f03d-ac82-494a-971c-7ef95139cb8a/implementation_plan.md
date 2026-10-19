# Plan de Calibración Económica, Sustentabilidad y Puesta a Punto Definitiva

Plan de ajuste matemático, equilibrio financiero y sustentabilidad del programa de fidelización para **Fulano Restobar** (Paseo Imperial 35, Madrid). Garantiza un retorno al cliente del 5% al 6% en valor percibido (con un coste real de materia prima para el bar de solo el 1,5% - 2,2%), erradicando la inflación de puntos, protegiendo el margen en caja y estableciendo una política de caducidad semestral por inactividad.

---

## 1. Modelo Económico y Calibración Matemática

### A. Ecuación de Rentabilidad y Escandallos en Hostelería
En bares y restaurantes gastronómicos con coctelería, el coste de mercadería (*Food & Beverage Cost*) suele representar entre el **25% y el 32%** del precio de venta al público (PVP). 

Al otorgar un **5,5% de retorno en valor facial de carta** al cliente, el **coste real directo para Fulano Restobar es de tan solo el 1,5% al 1,8%** de cada euro facturado:

$$\text{Valor facial de 1 punto} = 0,0055\text{ €} \quad (100\text{ pts} \approx 0,55\text{ €})$$
$$\text{Coste real para el bar por cada 100 pts} \approx 0,14\text{ €} \text{ a } 0,18\text{ €}$$

### B. Estructura de Acumulación (1 € = 10 pts base)
* **Bebidas sencillas y cafés**: Multiplicador $\times 1,0$ (10 pts por euro).
* **Cocina, carnes y empanadas**: Multiplicador $\times 1,2$ (12 pts por euro).
* **Cócteles de autor y combinados premium**: Multiplicador $\times 1,5$ (15 pts por euro - estimula el producto de mayor margen bruto del bar).
* **Postres artesanos**: Multiplicador $\times 1,2$ (12 pts por euro).

### C. Escalafón de Niveles (Premios al Cliente Frecuente)
* **Nivel Bronce** (0 a 999 pts acumulados): 0% bonus adicional (10 pts/€ base).
* **Nivel Plata** (1.000 a 2.999 pts acumulados / gasto ~100 €): +5% de bonus en puntos.
* **Nivel Oro** (3.000 a 6.999 pts acumulados / gasto ~300 €): +10% de bonus en puntos.
* **Nivel VIP** (7.000+ pts acumulados / gasto ~700 €): +20% de bonus en puntos.

### D. Rebalanceo del Catálogo de Recompensas
Ajuste de los costes en puntos para alinearlos estrictamente con el retorno del 5,5%:

| Recompensa | PVP en Carta | Coste Puntos Calibrado | Retorno Equivalente | Coste Real para el Bar (Escandallo) |
| :--- | :---: | :---: | :---: | :---: |
| **Caña de Cerveza o Café Especial** | 2,80 € | **500 pts** | 5,60% | ~0,45 € |
| **Empanada Criolla Fulano (Artesanal)** | 4,00 € | **720 pts** | 5,55% | ~0,90 € |
| **Ración de Croquetas Caseras** | 8,50 € | **1.550 pts** | 5,48% | ~1,80 € |
| **Cóctel de Autor del Bartender** | 11,00 € | **2.000 pts** | 5,50% | ~2,10 € |
| **Hamburguesa Ibérica o Milanesa XXL** | 14,50 € | **2.650 pts** | 5,47% | ~3,80 € |
| **Camiseta Merchandising Fulano** | 19,00 € | **3.500 pts** | 5,42% | ~5,00 € |
| **Cena Degustación para 2 Personas** | 75,00 € | **13.600 pts** | 5,51% | ~19,50 € |

---

## 2. Política de Caducidad Semestral (6 Meses de Inactividad)

* **Objetivo de Negocio**: Proteger al negocio contra pasivos de puntos estancados y reactivar a clientes dormidos.
* **Mecánica**:
  1. Cada vez que un socio consume en barra o canjea un ticket BDP, su fecha de última actividad (`last_activity_at`) se renueva a la fecha actual.
  2. En la billetera del cliente (`ClientView`), se visualiza claramente el indicador de vigencia: *«Puntos vigentes hasta [Fecha + 6 meses] · Se renuevan con cada visita»*.
  3. Si un socio no registra consumos en 180 días continuos, sus puntos expiran automáticamente, enviando un recordatorio previo para incentivarlo a volver.

---

## 3. Plan de Cambios Técnicos en el Código

### Paso 1: Actualización de Parámetros en Backend (`src/server/db.ts` y `src/server/routes.ts`)
* Actualizar los valores por defecto de `system_config` en la base de datos para reflejar la escala calibrada:
  * Multiplicadores: Bebida (1.0), Cóctel (1.5), Plato/Empanada (1.2), Postre (1.2).
  * Umbrales de nivel: Plata (1.000 pts), Oro (3.000 pts), VIP (7.000 pts).
* Reajustar los puntos de catálogo de las recompensas en `rewards`.
* Añadir columna `last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` en la tabla `users` si no existe.
* En cada cobro (`registerConsumption`), canje de voucher o canje de ticket BDP, actualizar `last_activity_at = CURRENT_TIMESTAMP`.

### Paso 2: Calculadora / Simulador de Sustentabilidad en `AdminView.tsx`
* Crear un componente visual interactivo en la pestaña de Administración («Simulador Financiero de Lealtad»):
  * Inputs: Ticket medio (€), Clientes/día, % de clientes registrados en el club.
  * Outputs en tiempo real: Facturación mensual proyectada, Puntos emitidos, Coste de recompensas canjeadas (facial vs. real), Margen neto protegido y ROI estimado del programa.

### Paso 3: Indicador de Vigencia Semestral en `ClientView.tsx`
* Mostrar en la tarjeta digital de fidelidad la fecha de caducidad dinámica calculada a 6 meses desde su última actividad.
* Mensaje pedagógico y amigable: *«Tus puntos no caducan mientras visites Fulano al menos una vez cada 6 meses»*.

### Paso 4: Verificación y Puesta a Cero Definitiva
* Ejecutar la suite de pruebas automatizadas `test_e2e.ts` adaptada a la nueva escala.
* Purgar la base de datos a estado cero de apertura para dejar el sistema 100% listo para producción.
* Comprobar `lint_applet` y `compile_applet`.

---

## 4. Criterios de Aceptación

1. **Rentabilidad garantizada**: Ningún premio ofrece más del 6% de retorno facial ni menos del 5%.
2. **Sin inflación de puntos**: La relación 1 € = 10 pts y el coste de premios mantienen coherencia matemática en todo el ciclo de vida del cliente.
3. **Caducidad clara**: La interfaz de cliente y los registros de backend reflejan la vigencia semestral.
4. **Herramienta para el dueño**: El administrador cuenta con el simulador financiero interactivo para auditar la sustentabilidad en tiempo real.
