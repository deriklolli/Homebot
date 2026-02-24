export const CATEGORY_OPTIONS = [
  "Kitchen",
  "Laundry",
  "HVAC & Climate",
  "Water Systems",
  "Electrical & Safety",
  "Outdoor / Exterior",
  "Plumbing Fixtures",
  "Entertainment / Tech",
] as const;

export type AssetCategory = (typeof CATEGORY_OPTIONS)[number];

export const DEFAULT_ASSETS: Record<AssetCategory, string[]> = {
  Kitchen: [
    "Refrigerator",
    "Dishwasher",
    "Oven / Range",
    "Microwave",
    "Range Hood / Vent",
    "Garbage Disposal",
    "Ice Maker",
    "Wine Cooler",
  ],
  Laundry: ["Washer", "Dryer"],
  "HVAC & Climate": [
    "Furnace",
    "Air Conditioner (Central)",
    "Heat Pump",
    "Thermostat",
    "Humidifier / Dehumidifier",
    "Mini-Split Units",
    "Air Purifier",
  ],
  "Water Systems": [
    "Water Heater",
    "Water Softener",
    "Water Filtration System",
    "Sump Pump",
    "Well Pump",
    "Recirculation Pump",
  ],
  "Electrical & Safety": [
    "Electrical Panel",
    "Generator",
    "Smoke Detectors",
    "CO Detectors",
    "Security System / Cameras",
    "Doorbell",
    "Garage Door Opener",
  ],
  "Outdoor / Exterior": [
    "Sprinkler / Irrigation System",
    "Pool Pump & Heater",
    "Hot Tub",
    "Outdoor Grill (Built-in)",
    "Exterior Lighting System",
    "Septic System",
  ],
  "Plumbing Fixtures": [
    "Toilets",
    "Faucets",
    "Showerheads / Valves",
    "Bathtubs (Jetted)",
  ],
  "Entertainment / Tech": [
    "Home Theater / AV System",
    "Whole-Home Audio",
    "Networking (Router, Access Points)",
    "Smart Home Hub",
  ],
};

export interface HomeAsset {
  id: string;
  name: string;
  category: AssetCategory;
  make: string;
  model: string;
  serialNumber: string;
  purchaseDate: string | null;
  warrantyExpiration: string | null;
  location: string;
  notes: string;
  imageUrl: string;
  createdAt: string;
}
