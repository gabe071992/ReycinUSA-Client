# Reycin USA - Database Interface Specification

## Firebase Configuration
```typescript
const firebaseConfig = {
  apiKey: "AIzaSyCWsh5wSHSIBwndmcSqhh5c9jwGZeIwlDQ",
  authDomain: "xappstore-533b8.firebaseapp.com",
  databaseURL: "https://xappstore-533b8-default-rtdb.firebaseio.com",
  projectId: "xappstore-533b8",
  storageBucket: "xappstore-533b8.appspot.com",
  messagingSenderId: "996074459120",
  appId: "1:996074459120:web:bb2ef275f6dc308eb89735",
  measurementId: "G-8WFEMSLBWS"
};
```

## Database Root Structure
Base Path: `reycinUSA/`

## 1. META DATA INTERFACE

### Path: `reycinUSA/meta`
```typescript
interface MetaData {
  appVersionMin: string;
  termsUrl: string;
  supportEmail: string;
}

// Example Push Format:
{
  "appVersionMin": "1.0.0",
  "termsUrl": "https://reycin.com/terms",
  "supportEmail": "support@reyc.in"
}
```

**Push Method:**
```typescript
import { ref, set } from 'firebase/database';
await set(ref(database, 'reycinUSA/meta'), metaData);
```

## 2. ANNOUNCEMENTS INTERFACE

### Path: `reycinUSA/announcements/{announcementId}`
```typescript
interface Announcement {
  title: string;
  tag: "News" | "Release" | "Event";
  heroImage: string;
  bodyMd: string;
  createdAt: number;
  visible: boolean;
}

// Example Push Format:
{
  "title": "F300 Track Pack Released",
  "tag": "Release",
  "heroImage": "https://cdn.reycin.com/f300-hero.jpg",
  "bodyMd": "## New Track Pack\n\nExciting new features...",
  "createdAt": 1717420000000,
  "visible": true
}
```

**Push Method:**
```typescript
import { ref, push } from 'firebase/database';
const announcementRef = ref(database, 'reycinUSA/announcements');
await push(announcementRef, announcementData);
```

## 3. CATALOG INTERFACE

### Path: `reycinUSA/catalog/categories`
```typescript
interface Category {
  name: string;
  order: number;
}

// Push Format:
{
  "vehicles": { "name": "Vehicles", "order": 1 },
  "parts": { "name": "Parts", "order": 2 },
  "services": { "name": "Services", "order": 3 },
  "warranties": { "name": "Warranties", "order": 4 },
  "insurance": { "name": "Insurance", "order": 5 }
}
```

**Push Method:**
```typescript
await set(ref(database, 'reycinUSA/catalog/categories'), categoriesData);
```

### Path: `reycinUSA/catalog/products/{productId}`

#### Vehicle Products
```typescript
interface VehicleProduct {
  category: "vehicles";
  name: string;
  subtitle: string;
  media: string[];
  price: number;
  currency: "USD";
  specs: {
    engine: string;
    weight_lbs: number;
    hp: number;
  };
  options: {
    color: string[];
    packages: string[];
  };
  active: boolean;
}

// Example Push Format:
{
  "category": "vehicles",
  "name": "Reycin F300",
  "subtitle": "Mono-cock single-seater",
  "media": ["https://cdn.reycin.com/f300_1.jpg", "https://cdn.reycin.com/f300_2.jpg"],
  "price": 0,
  "currency": "USD",
  "specs": {
    "engine": "Inline-4 (RXT4-5 ready)",
    "weight_lbs": 600,
    "hp": 80
  },
  "options": {
    "color": ["Matte Black", "Gloss Black"],
    "packages": ["Track Pack", "Telemetry Pack"]
  },
  "active": true
}
```

#### Parts Products
```typescript
interface PartProduct {
  category: "parts";
  name: string;
  compat: string[];
  price: number;
  currency: "USD";
  stock: number;
  sku: string;
  active: boolean;
}

// Example Push Format:
{
  "category": "parts",
  "name": "Oil Temperature Probe",
  "compat": ["F300", "900", "900R"],
  "price": 89.0,
  "currency": "USD",
  "stock": 42,
  "sku": "RX-OTP-7P",
  "active": true
}
```

#### Service Products
```typescript
interface ServiceProduct {
  category: "services";
  name: string;
  durationHrs: number;
  price: number;
  currency: "USD";
  active: boolean;
}

// Example Push Format:
{
  "category": "services",
  "name": "Track Support Service",
  "durationHrs": 8,
  "price": 1200,
  "currency": "USD",
  "active": true
}
```

#### Warranty Products
```typescript
interface WarrantyProduct {
  category: "warranties";
  name: string;
  termMonths: number;
  coverages: string[];
  price: number;
  currency: "USD";
  active: boolean;
}

// Example Push Format:
{
  "category": "warranties",
  "name": "Reycin Plus Warranty",
  "termMonths": 24,
  "coverages": ["powertrain", "electronics"],
  "price": 2499,
  "currency": "USD",
  "active": true
}
```

#### Insurance Products
```typescript
interface InsuranceProduct {
  category: "insurance";
  name: string;
  provider: string;
  premiumMo: number;
  currency: "USD";
  termsUrl: string;
  active: boolean;
}

// Example Push Format:
{
  "category": "insurance",
  "name": "Base Insurance Plan",
  "provider": "Reycin Partner",
  "premiumMo": 199,
  "currency": "USD",
  "termsUrl": "https://partner.com/terms",
  "active": true
}
```

**Push Method for Products:**
```typescript
await set(ref(database, `reycinUSA/catalog/products/${productId}`), productData);
```

## 4. USERS INTERFACE

### Path: `reycinUSA/users/{uid}`
```typescript
interface User {
  email: string;
  displayName: string;
  createdAt: number;
  vehicles?: Record<string, UserVehicle>;
  addresses?: Record<string, UserAddress>;
}

interface UserVehicle {
  model: string;
  vin: string;
  year: number;
}

interface UserAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  postal: string;
}

// Example Push Format:
{
  "email": "owner@example.com",
  "displayName": "Driver One",
  "createdAt": 1717420000000,
  "vehicles": {
    "veh_ABC123": {
      "model": "F300",
      "vin": "RXF3000001",
      "year": 2025
    }
  },
  "addresses": {
    "addr1": {
      "line1": "123 Racing St",
      "city": "Detroit",
      "state": "MI",
      "country": "US",
      "postal": "48201"
    }
  }
}
```

**Push Method:**
```typescript
await set(ref(database, `reycinUSA/users/${uid}`), userData);
```

## 5. ORDERS INTERFACE

### Path: `reycinUSA/orders/{orderId}`
```typescript
interface Order {
  uid: string;
  items: OrderItem[];
  subtotal: number;
  currency: "USD";
  status: "quote" | "pending" | "paid" | "fulfilled" | "canceled";
  createdAt: number;
  shippingAddress?: string; // address ID reference
}

interface OrderItem {
  productId: string;
  qty: number;
  price: number;
}

// Example Push Format:
{
  "uid": "uid_ABC",
  "items": [
    {
      "productId": "veh_f300",
      "qty": 1,
      "price": 0
    },
    {
      "productId": "svc_track_support",
      "qty": 1,
      "price": 1200
    }
  ],
  "subtotal": 1200,
  "currency": "USD",
  "status": "quote",
  "createdAt": 1717420000000,
  "shippingAddress": "addr1"
}
```

**Push Method:**
```typescript
const orderRef = ref(database, 'reycinUSA/orders');
await push(orderRef, orderData);
```

## 6. CART INTERFACE

### Path: `reycinUSA/cart/{uid}`
```typescript
interface Cart {
  items: Record<string, number>; // productId -> quantity
  updatedAt: number;
}

// Example Push Format:
{
  "items": {
    "veh_f300": 1,
    "part_oil_temp_probe": 2
  },
  "updatedAt": 1717420000000
}
```

**Push Method:**
```typescript
await set(ref(database, `reycinUSA/cart/${uid}`), cartData);
```

## 7. OBD INTERFACE

### Path: `reycinUSA/obd/profiles/{profileId}`
```typescript
interface OBDProfile {
  name: string;
  pollRateHz: number;
  pids: string[];
  mode08Controls: string[];
}

// Example Push Format:
{
  "name": "Default Profile",
  "pollRateHz": 10,
  "pids": ["0C", "05", "0F", "2F", "10", "42"],
  "mode08Controls": ["fan_main", "pump_aux", "compressor", "aero_flap"]
}
```

**Push Method:**
```typescript
await set(ref(database, `reycinUSA/obd/profiles/${profileId}`), profileData);
```

### Path: `reycinUSA/obd/sessions/{sessionId}`
```typescript
interface OBDSession {
  uid: string;
  vehicleId: string;
  startedAt: number;
  endedAt: number | null;
  profile: string;
  notes: string;
  logSummary?: {
    samples: number;
    durationSec: number;
  };
}

// Example Push Format:
{
  "uid": "uid_ABC",
  "vehicleId": "veh_ABC123",
  "startedAt": 1717420000000,
  "endedAt": null,
  "profile": "default",
  "notes": "Shakedown laps",
  "logSummary": {
    "samples": 12450,
    "durationSec": 900
  }
}
```

**Push Method:**
```typescript
const sessionRef = ref(database, 'reycinUSA/obd/sessions');
await push(sessionRef, sessionData);
```

### Path: `reycinUSA/obd/sessionLogs/{sessionId}/{timestamp}`
```typescript
interface OBDLogEntry {
  rpm?: number;
  ect_c?: number; // Engine Coolant Temperature
  iat_c?: number; // Intake Air Temperature
  map_kpa?: number; // Manifold Absolute Pressure
  vbat?: number; // Battery Voltage
  [key: string]: number | undefined;
}

// Example Push Format:
{
  "rpm": 3120,
  "ect_c": 84,
  "iat_c": 27,
  "map_kpa": 98,
  "vbat": 13.9
}
```

**Push Method:**
```typescript
const timestamp = `t_${Date.now()}`;
await set(ref(database, `reycinUSA/obd/sessionLogs/${sessionId}/${timestamp}`), logEntry);
```

### Path: `reycinUSA/obd/dtcs/{vehicleId}`
```typescript
interface DTCData {
  active: string[];
  pending: string[];
  history: Record<string, string[]>; // timestamp -> codes
}

// Example Push Format:
{
  "active": ["P0128", "P0113"],
  "pending": [],
  "history": {
    "1717420000000": ["P0128"]
  }
}
```

**Push Method:**
```typescript
await set(ref(database, `reycinUSA/obd/dtcs/${vehicleId}`), dtcData);
```

### Path: `reycinUSA/obd/firmware/{vehicleId}`
```typescript
interface FirmwareInfo {
  ecuModel: string;
  version: string;
  lastChecked: number;
}

// Example Push Format:
{
  "ecuModel": "ESP32-ECU-A1",
  "version": "0.9.3",
  "lastChecked": 1717420000000
}
```

**Push Method:**
```typescript
await set(ref(database, `reycinUSA/obd/firmware/${vehicleId}`), firmwareInfo);
```

## 8. SERVICE BOOKINGS INTERFACE

### Path: `reycinUSA/serviceBookings/{bookingId}`
```typescript
interface ServiceBooking {
  uid: string;
  vehicleId: string;
  serviceId: string;
  dateISO: string; // YYYY-MM-DD format
  status: "requested" | "confirmed" | "in_progress" | "completed" | "canceled";
  notes: string;
  createdAt: number;
}

// Example Push Format:
{
  "uid": "uid_ABC",
  "vehicleId": "veh_ABC123",
  "serviceId": "svc_track_support",
  "dateISO": "2025-04-22",
  "status": "requested",
  "notes": "Pre-race inspection",
  "createdAt": 1717420000000
}
```

**Push Method:**
```typescript
const bookingRef = ref(database, 'reycinUSA/serviceBookings');
await push(bookingRef, bookingData);
```

## 9. COMPLETE DATABASE INITIALIZATION SCRIPT

```typescript
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCWsh5wSHSIBwndmcSqhh5c9jwGZeIwlDQ",
  authDomain: "xappstore-533b8.firebaseapp.com",
  databaseURL: "https://xappstore-533b8-default-rtdb.firebaseio.com",
  projectId: "xappstore-533b8",
  storageBucket: "xappstore-533b8.appspot.com",
  messagingSenderId: "996074459120",
  appId: "1:996074459120:web:bb2ef275f6dc308eb89735",
  measurementId: "G-8WFEMSLBWS"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Initialize all database paths with sample data
export async function initializeDatabase() {
  // Meta data
  await set(ref(database, 'reycinUSA/meta'), {
    appVersionMin: "1.0.0",
    termsUrl: "https://reycin.com/terms",
    supportEmail: "support@reyc.in"
  });

  // Categories
  await set(ref(database, 'reycinUSA/catalog/categories'), {
    vehicles: { name: "Vehicles", order: 1 },
    parts: { name: "Parts", order: 2 },
    services: { name: "Services", order: 3 },
    warranties: { name: "Warranties", order: 4 },
    insurance: { name: "Insurance", order: 5 }
  });

  // Sample products
  await set(ref(database, 'reycinUSA/catalog/products/veh_f300'), {
    category: "vehicles",
    name: "Reycin F300",
    subtitle: "Mono-cock single-seater",
    media: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
    price: 0,
    currency: "USD",
    specs: {
      engine: "Inline-4 (RXT4-5 ready)",
      weight_lbs: 600,
      hp: 80
    },
    options: {
      color: ["Matte Black", "Gloss Black"],
      packages: ["Track Pack", "Telemetry Pack"]
    },
    active: true
  });

  // OBD Profile
  await set(ref(database, 'reycinUSA/obd/profiles/default'), {
    name: "Default Profile",
    pollRateHz: 10,
    pids: ["0C", "05", "0F", "2F", "10", "42"],
    mode08Controls: ["fan_main", "pump_aux", "compressor", "aero_flap"]
  });

  console.log('Database initialized successfully');
}
```

## 10. BATCH OPERATIONS

### Batch Write Multiple Items
```typescript
import { ref, update } from 'firebase/database';

export async function batchWrite(updates: Record<string, any>) {
  await update(ref(database), updates);
}

// Example usage:
const batchUpdates = {
  'reycinUSA/catalog/products/part_001': partData,
  'reycinUSA/catalog/products/part_002': partData2,
  'reycinUSA/announcements/ann_001': announcementData
};
await batchWrite(batchUpdates);
```

## 11. REAL-TIME LISTENERS

### Listen to Data Changes
```typescript
import { ref, onValue, off } from 'firebase/database';

export function listenToPath(path: string, callback: (data: any) => void) {
  const dataRef = ref(database, path);
  onValue(dataRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  
  // Return unsubscribe function
  return () => off(dataRef);
}
```

## 12. DATA VALIDATION SCHEMAS

### Zod Schemas for Type Safety
```typescript
import { z } from 'zod';

export const AnnouncementSchema = z.object({
  title: z.string(),
  tag: z.enum(["News", "Release", "Event"]),
  heroImage: z.string().url(),
  bodyMd: z.string(),
  createdAt: z.number(),
  visible: z.boolean()
});

export const VehicleProductSchema = z.object({
  category: z.literal("vehicles"),
  name: z.string(),
  subtitle: z.string(),
  media: z.array(z.string().url()),
  price: z.number(),
  currency: z.literal("USD"),
  specs: z.object({
    engine: z.string(),
    weight_lbs: z.number(),
    hp: z.number()
  }),
  options: z.object({
    color: z.array(z.string()),
    packages: z.array(z.string())
  }),
  active: z.boolean()
});
```

This specification provides exact paths, formats, and methods for pushing all data types to the Firebase Realtime Database for the Reycin USA application.