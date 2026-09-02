-- =============================================================
-- HOMEBOT Demo Account Seed Script
-- =============================================================
-- Usage:
--   1. Create demo@homebot.com account via the signup page
--   2. Copy the user UUID from Supabase Auth → Users
--   3. Replace USER_ID_HERE below with that UUID
--   4. Run this entire script in Supabase SQL Editor
--
-- This script is idempotent — it deletes existing demo data
-- before inserting, so it can be run multiple times safely.
-- =============================================================

DO $$
DECLARE
  demo_uid UUID := 'b64e38d9-2351-4cce-b9d6-cfb9dad897ca';

  -- Contractor IDs
  c_smarthome UUID;
  c_hvac UUID;
  c_electric UUID;
  c_plumbing UUID;
  c_roofing UUID;
  c_landscape UUID;

  -- Home Asset IDs
  a_thermostat UUID;
  a_heatpump UUID;
  a_fridge UUID;
  a_washer UUID;
  a_dryer UUID;
  a_waterheater UUID;
  a_garage UUID;
  a_network UUID;
  a_dishwasher UUID;
  a_security UUID;

  -- Project IDs
  p_solar UUID;
  p_wiring UUID;
  p_patio UUID;
  p_roof UUID;

BEGIN
  -- ===========================================
  -- CLEAN UP existing demo data
  -- ===========================================
  DELETE FROM project_invoices WHERE user_id = demo_uid;
  DELETE FROM project_images WHERE user_id = demo_uid;
  DELETE FROM project_notes WHERE user_id = demo_uid;
  DELETE FROM project_events WHERE user_id = demo_uid;
  DELETE FROM projects WHERE user_id = demo_uid;
  DELETE FROM inventory_items WHERE user_id = demo_uid;
  DELETE FROM services WHERE user_id = demo_uid;
  DELETE FROM contractors WHERE user_id = demo_uid;
  DELETE FROM home_assets WHERE user_id = demo_uid;
  DELETE FROM tasks WHERE user_id = demo_uid;

  -- ===========================================
  -- CONTRACTORS
  -- ===========================================
  INSERT INTO contractors (user_id, name, company, phone, email, specialty, rating, notes, website, logo_url)
  VALUES (demo_uid, 'Jason Miller', 'SmartHome Pro', '(555) 101-2020', 'jason@smarthomepro.com', 'Home AV', 5, 'Excellent work on whole-home automation. Very knowledgeable about smart home ecosystems.', 'https://smarthomepro.example.com', '')
  RETURNING id INTO c_smarthome;

  INSERT INTO contractors (user_id, name, company, phone, email, specialty, rating, notes, website, logo_url)
  VALUES (demo_uid, 'Maria Chen', 'GreenTech HVAC', '(555) 202-3030', 'maria@greentechhvac.com', 'HVAC', 4, 'Installed heat pump system. Great at explaining energy efficiency options.', 'https://greentechhvac.example.com', '')
  RETURNING id INTO c_hvac;

  INSERT INTO contractors (user_id, name, company, phone, email, specialty, rating, notes, website, logo_url)
  VALUES (demo_uid, 'David Park', 'Elite Electric', '(555) 303-4040', 'david@eliteelectric.com', 'Electrician', 5, 'Handled solar panel electrical work and 200A panel upgrade. Licensed and insured.', 'https://eliteelectric.example.com', '')
  RETURNING id INTO c_electric;

  INSERT INTO contractors (user_id, name, company, phone, email, specialty, rating, notes, website, logo_url)
  VALUES (demo_uid, 'Tom Rodriguez', 'AquaPure Plumbing', '(555) 404-5050', 'tom@aquapureplumbing.com', 'Plumber', 4, 'Installed tankless recirculation pump. Responds quickly to emergencies.', 'https://aquapureplumbing.example.com', '')
  RETURNING id INTO c_plumbing;

  INSERT INTO contractors (user_id, name, company, phone, email, specialty, rating, notes, website, logo_url)
  VALUES (demo_uid, 'Rick Sanchez', 'Summit Roofing', '(555) 505-6060', 'rick@summitroofing.com', 'Roofer', 3, 'Did an inspection and minor repairs. Pricing was a bit high but work quality was solid.', 'https://summitroofing.example.com', '')
  RETURNING id INTO c_roofing;

  INSERT INTO contractors (user_id, name, company, phone, email, specialty, rating, notes, website, logo_url)
  VALUES (demo_uid, 'Sarah Kim', 'ProScape Landscaping', '(555) 606-7070', 'sarah@proscape.com', 'Landscaper', 5, 'Designing and building our patio. Great eye for outdoor living spaces.', 'https://proscape.example.com', '')
  RETURNING id INTO c_landscape;

  -- ===========================================
  -- HOME ASSETS
  -- ===========================================
  INSERT INTO home_assets (user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url)
  VALUES (demo_uid, 'Smart Thermostat', 'HVAC & Climate', 'Ecobee', 'Premium', 'EB-2024-88421', '2024-03-15', '2027-03-15', 'Hallway', 'Controls heat pump and auxiliary heat. Integrated with HomeKit and Alexa.', 'https://www.ecobee.com/en-us/smart-thermostats/smart-thermostat-premium/')
  RETURNING id INTO a_thermostat;

  INSERT INTO home_assets (user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url)
  VALUES (demo_uid, 'Heat Pump System', 'HVAC & Climate', 'Mitsubishi', 'MUZ-FH18NAH Hyper-Heating', 'MT-FH18-90234', '2023-11-01', '2033-11-01', 'Exterior / Utility Room', 'Ducted mini-split heat pump. Handles heating down to -13F. 10-year compressor warranty.', '')
  RETURNING id INTO a_heatpump;

  INSERT INTO home_assets (user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url)
  VALUES (demo_uid, 'Refrigerator', 'Kitchen', 'Samsung', 'RF29BB8600QL Bespoke 4-Door', 'SM-RF29-44198', '2024-01-20', '2026-01-20', 'Kitchen', 'French door with FlexZone drawer. Internal cameras for remote viewing.', '')
  RETURNING id INTO a_fridge;

  INSERT INTO home_assets (user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url)
  VALUES (demo_uid, 'Washer', 'Laundry', 'LG', 'WKEX200HBA WashTower', 'LG-WT-55712', '2024-02-10', '2026-02-10', 'Laundry Room', 'All-in-one stacked unit. AI-powered wash cycles. ThinQ app connected.', '')
  RETURNING id INTO a_washer;

  INSERT INTO home_assets (user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url)
  VALUES (demo_uid, 'Dryer', 'Laundry', 'LG', 'WKEX200HBA WashTower', 'LG-WT-55713', '2024-02-10', '2026-02-10', 'Laundry Room', 'Heat pump dryer (top unit of WashTower). Very energy efficient.', '')
  RETURNING id INTO a_dryer;

  INSERT INTO home_assets (user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url)
  VALUES (demo_uid, 'Water Heater', 'Water Systems', 'Rheem', 'ProTerra XE65T10HD55U1 Hybrid', 'RH-PT65-33891', '2023-09-15', '2033-09-15', 'Basement', 'Hybrid heat pump water heater. 65 gallon. COP 3.75 — very efficient.', '')
  RETURNING id INTO a_waterheater;

  INSERT INTO home_assets (user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url)
  VALUES (demo_uid, 'Garage Door Opener', 'Electrical & Safety', 'LiftMaster', '87504-267 myQ Smart', 'LM-87504-22019', '2024-06-01', '2026-06-01', 'Garage', 'Belt drive, ultra-quiet. myQ app for remote monitoring and control.', '')
  RETURNING id INTO a_garage;

  INSERT INTO home_assets (user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url)
  VALUES (demo_uid, 'Networking', 'Entertainment / Tech', 'Ubiquiti', 'UDM-Pro UniFi Dream Machine Pro', 'UI-UDM-77230', '2024-04-20', '2026-04-20', 'Office Closet', 'Router + NVR + controller. 3 UniFi 6 access points throughout house.', '')
  RETURNING id INTO a_network;

  INSERT INTO home_assets (user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url)
  VALUES (demo_uid, 'Dishwasher', 'Kitchen', 'Bosch', 'SHP78CM5N 800 Series', 'BSH-800-66140', '2024-01-20', '2026-01-20', 'Kitchen', 'CrystalDry technology. 42 dBA — whisper quiet. Third rack for utensils.', '')
  RETURNING id INTO a_dishwasher;

  INSERT INTO home_assets (user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url)
  VALUES (demo_uid, 'Security System', 'Electrical & Safety', 'Ring', 'Alarm Pro 2nd Gen', 'RNG-AP2-11456', '2024-05-10', '2025-05-10', 'Whole Home', '14-piece kit. Built-in eero Wi-Fi 6 router. 24/7 professional monitoring.', '')
  RETURNING id INTO a_security;

  -- ===========================================
  -- PROJECTS
  -- ===========================================
  INSERT INTO projects (user_id, name, description, contractor_id, home_asset_id, notes, status, total_cost, contractor_rating, completed_at)
  VALUES (demo_uid, 'Solar Panel Installation', '8.5kW rooftop solar array with microinverters and consumption monitoring.', c_electric, NULL, 'Received 30% federal tax credit. System produces ~10,000 kWh/year. Monitoring via Enphase app.', 'Completed', 18500, 5, '2024-08-15T00:00:00Z')
  RETURNING id INTO p_solar;

  INSERT INTO projects (user_id, name, description, contractor_id, home_asset_id, notes, status, total_cost, contractor_rating, completed_at)
  VALUES (demo_uid, 'Smart Home Wiring Upgrade', 'Ran Cat6A ethernet to every room and installed structured wiring panel in office closet.', c_smarthome, a_network, 'Also added dedicated 20A circuits for office equipment and future EV charger prep.', 'Completed', 4200, 5, '2024-05-20T00:00:00Z')
  RETURNING id INTO p_wiring;

  INSERT INTO projects (user_id, name, description, contractor_id, home_asset_id, notes, status, total_cost, contractor_rating, completed_at)
  VALUES (demo_uid, 'Backyard Patio & Landscaping', 'Multi-level paver patio with built-in fire pit, outdoor kitchen area, and native plant landscaping.', c_landscape, NULL, 'Phase 1 (patio) almost done. Phase 2 (planting) starts in spring. Using drought-tolerant native plants.', 'In Progress', 12000, NULL, NULL)
  RETURNING id INTO p_patio;

  INSERT INTO projects (user_id, name, description, contractor_id, home_asset_id, notes, status, total_cost, contractor_rating, completed_at)
  VALUES (demo_uid, 'Roof Inspection & Repair', 'Annual inspection revealed minor flashing issues around skylights. Repair and reseal needed.', c_roofing, NULL, 'Summit quoted $2,800 for repairs. Getting a second opinion from another roofer.', 'In Progress', 2800, NULL, NULL)
  RETURNING id INTO p_roof;

  -- ===========================================
  -- PROJECT EVENTS
  -- ===========================================
  -- Patio project events
  INSERT INTO project_events (user_id, project_id, title, event_date, event_time, event_end_time)
  VALUES (demo_uid, p_patio, 'Patio base inspection', '2026-02-20', '09:00:00', '10:00:00');

  INSERT INTO project_events (user_id, project_id, title, event_date, event_time, event_end_time)
  VALUES (demo_uid, p_patio, 'Paver delivery & install begins', '2026-03-10', '08:00:00', '16:00:00');

  INSERT INTO project_events (user_id, project_id, title, event_date, event_time, event_end_time)
  VALUES (demo_uid, p_patio, 'Fire pit and outdoor kitchen rough-in', '2026-03-24', '08:00:00', '15:00:00');

  -- Roof project events
  INSERT INTO project_events (user_id, project_id, title, event_date, event_time, event_end_time)
  VALUES (demo_uid, p_roof, 'Second opinion inspection', '2026-03-05', '10:00:00', '11:00:00');

  INSERT INTO project_events (user_id, project_id, title, event_date, event_time, event_end_time)
  VALUES (demo_uid, p_roof, 'Skylight flashing repair', '2026-03-18', '08:00:00', '12:00:00');

  -- Solar project note (completed)
  INSERT INTO project_notes (user_id, project_id, content)
  VALUES (demo_uid, p_solar, 'System passed final city inspection. Interconnection agreement with utility approved. Net metering active as of September 1.');

  INSERT INTO project_notes (user_id, project_id, content)
  VALUES (demo_uid, p_wiring, 'All ethernet drops tested at 10Gbps. UniFi controller configured. Guest network set up separately.');

  INSERT INTO project_notes (user_id, project_id, content)
  VALUES (demo_uid, p_patio, 'Selected Belgard Mega-Arbel pavers in Toscana blend. Fire pit will be natural gas plumbed from house.');

  -- ===========================================
  -- INVENTORY ITEMS
  -- ===========================================
  INSERT INTO inventory_items (user_id, name, description, frequency_months, last_ordered_date, next_reminder_date, purchase_url, thumbnail_url, notes, cost, home_asset_id)
  VALUES (demo_uid, 'HVAC Air Filter', 'MERV 13 pleated filter for heat pump air handler', 3, '2026-01-15', '2026-04-15', '', '', 'Size: 20x25x4. Buy MERV 13 or higher for best air quality.', 28, a_heatpump);

  INSERT INTO inventory_items (user_id, name, description, frequency_months, last_ordered_date, next_reminder_date, purchase_url, thumbnail_url, notes, cost, home_asset_id)
  VALUES (demo_uid, 'Water Heater Anode Rod', 'Magnesium anode rod to prevent tank corrosion', 12, '2025-09-15', '2026-09-15', '', '', 'Check annually. Replace when rod is less than 1/2" thick.', 35, a_waterheater);

  INSERT INTO inventory_items (user_id, name, description, frequency_months, last_ordered_date, next_reminder_date, purchase_url, thumbnail_url, notes, cost, home_asset_id)
  VALUES (demo_uid, 'Dishwasher Cleaner', 'Bosch dishwasher cleaning tablets', 2, '2026-02-01', '2026-04-01', '', '', 'Run a cleaning cycle on empty dishwasher. Helps with hard water buildup.', 12, a_dishwasher);

  INSERT INTO inventory_items (user_id, name, description, frequency_months, last_ordered_date, next_reminder_date, purchase_url, thumbnail_url, notes, cost, home_asset_id)
  VALUES (demo_uid, 'Refrigerator Water Filter', 'Samsung DA29-00020B replacement filter', 6, '2025-12-20', '2026-06-20', '', '', 'Replace when filter indicator light turns red. Twist to remove.', 42, a_fridge);

  INSERT INTO inventory_items (user_id, name, description, frequency_months, last_ordered_date, next_reminder_date, purchase_url, thumbnail_url, notes, cost, home_asset_id)
  VALUES (demo_uid, 'Smoke Detector Batteries', '9V lithium batteries for all smoke and CO detectors', 12, '2025-11-01', '2026-11-01', 'https://www.amazon.com/dp/B07FF8CS1D', '', '8 detectors total — replace all at once during fall time change.', 24, NULL);

  INSERT INTO inventory_items (user_id, name, description, frequency_months, last_ordered_date, next_reminder_date, purchase_url, thumbnail_url, notes, cost, home_asset_id)
  VALUES (demo_uid, 'Water Softener Salt', 'Morton Clean and Protect water softener pellets (40lb bag)', 2, '2026-02-10', '2026-04-10', 'https://www.amazon.com/dp/B07GKMT4PF', '', 'Check salt level monthly. Top off when below half.', 8, NULL);

  INSERT INTO inventory_items (user_id, name, description, frequency_months, last_ordered_date, next_reminder_date, purchase_url, thumbnail_url, notes, cost, home_asset_id)
  VALUES (demo_uid, 'Humidifier Pad', 'Replacement evaporator pad for whole-home humidifier', 6, '2025-10-01', '2026-04-01', '', '', 'Replace at the start of each heating season and mid-season.', 18, a_heatpump);

  INSERT INTO inventory_items (user_id, name, description, frequency_months, last_ordered_date, next_reminder_date, purchase_url, thumbnail_url, notes, cost, home_asset_id)
  VALUES (demo_uid, 'Garage Door Lubricant', 'White lithium grease for rails, rollers, and hinges', 6, '2025-12-01', '2026-06-01', '', '', 'Spray rollers, hinges, springs, and rail. Wipe excess.', 9, a_garage);

  -- ===========================================
  -- SERVICES
  -- ===========================================
  INSERT INTO services (user_id, name, provider, contractor_id, cost, frequency_months, last_service_date, next_service_date, home_asset_id, phone, notes)
  VALUES (demo_uid, 'HVAC Maintenance', 'GreenTech HVAC', c_hvac, 189, 6, '2025-11-15', '2026-05-15', a_heatpump, '(555) 202-3030', 'Spring and fall tune-ups. Includes coil cleaning, refrigerant check, and filter replacement.');

  INSERT INTO services (user_id, name, provider, contractor_id, cost, frequency_months, last_service_date, next_service_date, home_asset_id, phone, notes)
  VALUES (demo_uid, 'Lawn Care', 'ProScape Landscaping', c_landscape, 150, 1, '2026-02-15', '2026-03-15', NULL, '(555) 606-7070', 'Weekly mowing April–October. Monthly leaf cleanup and edging rest of year.');

  INSERT INTO services (user_id, name, provider, contractor_id, cost, frequency_months, last_service_date, next_service_date, home_asset_id, phone, notes)
  VALUES (demo_uid, 'Pool Service', 'CrystalClear Pools', NULL, 120, 1, '2026-02-01', '2026-03-01', NULL, '(555) 707-8080', 'Chemical balancing, skimming, and filter check. Seasonal opening/closing included in annual contract.');

  INSERT INTO services (user_id, name, provider, contractor_id, cost, frequency_months, last_service_date, next_service_date, home_asset_id, phone, notes)
  VALUES (demo_uid, 'Gutter Cleaning', 'Apex Home Services', NULL, 225, 6, '2025-11-20', '2026-05-20', NULL, '(555) 808-9090', 'Spring and fall cleaning. Includes downspout flush and gutter guard inspection.');

  INSERT INTO services (user_id, name, provider, contractor_id, cost, frequency_months, last_service_date, next_service_date, home_asset_id, phone, notes)
  VALUES (demo_uid, 'Pest Control', 'Shield Pest Solutions', NULL, 95, 3, '2026-01-10', '2026-04-10', NULL, '(555) 909-1010', 'Quarterly perimeter treatment. Annual termite inspection in spring.');

  -- ===========================================
  -- TASKS
  -- ===========================================
  INSERT INTO tasks (user_id, title, completed)
  VALUES (demo_uid, 'Schedule solar panel cleaning', false);

  INSERT INTO tasks (user_id, title, completed)
  VALUES (demo_uid, 'Get quotes for EV charger installation', false);

  INSERT INTO tasks (user_id, title, completed)
  VALUES (demo_uid, 'Update home insurance policy', true);

  INSERT INTO tasks (user_id, title, completed)
  VALUES (demo_uid, 'Register warranty for dishwasher', true);

END $$;
