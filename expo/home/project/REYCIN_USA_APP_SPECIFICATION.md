# Reycin USA Mobile Application - Complete Specification Document

## 1. Application Overview

### 1.1 Core Information
- **App Name**: Reycin USA
- **Platform**: iOS 15+ and Android 10+ (React Native Expo)
- **Primary Purpose**: Luxury automotive brand app for vehicle management, diagnostics, shopping, and owner services
- **Design Language**: Ultra-sleek monochrome (black & white only)
- **Authentication**: Firebase Auth (email/password only)
- **Database**: Firebase Realtime Database (RTDB)
- **State Management**: Zustand + React Query

### 1.2 Technology Stack
```
Frontend:
- React Native (Expo SDK 53)
- TypeScript (strict mode)
- React Navigation (stack + bottom tabs)
- Zustand (local state)
- React Query (server state/caching)

Backend:
- Firebase Authentication
- Firebase Realtime Database
- No OAuth, no storage, auth and RTDB only

Connectivity:
- WebSockets (OBD over Wi-Fi)
- BLE (Reycin dongle)
- USB-Serial (Android only)
```

## 2. Visual Design System

### 2.1 Color Palette
```
Primary Colors:
- Pure Black: #000000
- Off-White: #F5F5F5
- Soft Gray Dark: #141414
- Soft Gray Light: #1E1E1E
- White Glow: rgba(255, 255, 255, 0.72) for icons
- Divider Lines: rgba(255, 255, 255, 0.12)
```

### 2.2 Typography
```
Display:
- Logo: Custom "Reycin" script (SVG/PNG)
- Headlines: Inter Semibold or SF Pro Semibold
- Body: Inter Regular
- Sizes: 
  - H1: 32px
  - H2: 24px
  - H3: 20px
  - Body: 16px
  - Caption: 14px
```

### 2.3 Design Rules
- Border Radius: 12px for all rectangles
- No skeuomorphism
- Subtle inner glow on hero text
- 1px hairline dividers at 12% white opacity
- Icons: Lucide icons (outlined, 2px stroke, white at 72%)
- Animations: 150-200ms ease-in-out
- Page transitions: fade/slide
- Target: 60Hz performance

## 3. Application Structure

### 3.1 Navigation Hierarchy
```
Root
├── AuthStack (unauthenticated)
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── VerifyEmailScreen
│
└── MainTabs (authenticated)
    ├── Home Tab
    │   └── HomeScreen (landing/news)
    │
    ├── Shop Tab
    │   ├── ShopScreen (categories grid)
    │   ├── CategoryScreen
    │   ├── ProductScreen
    │   ├── CartScreen
    │   └── CheckoutScreen (placeholder)
    │
    ├── OBD Tab
    │   ├── OBDScreen (main)
    │   ├── OBDConnectScreen
    │   ├── OBDDashboardScreen
    │   ├── OBDSessionScreen
    │   ├── OBDDTCsScreen
    │   ├── OBDActuationScreen
    │   └── OBDFirmwareScreen
    │
    ├── Garage Tab
    │   ├── GarageScreen
    │   ├── VehicleDetailScreen
    │   └── ServiceBookingScreen
    │
    └── Account Tab
        ├── AccountScreen
        ├── OrdersScreen
        ├── AddressesScreen
        └── SettingsScreen
```

### 3.2 File Structure
```
/app
  /_layout.tsx (root layout with providers)
  /(auth)
    /_layout.tsx (auth stack)
    /login.tsx
    /register.tsx
    /verify-email.tsx
  /(tabs)
    /_layout.tsx (tab navigator)
    /(shop)
      /_layout.tsx (shop stack)
      /index.tsx (shop home)
      /[categoryId].tsx
      /product/[productId].tsx
      /cart.tsx
      /checkout.tsx
    /(obd)
      /_layout.tsx (obd stack)
      /index.tsx (obd home)
      /connect.tsx
      /dashboard.tsx
      /session.tsx
      /dtcs.tsx
      /actuation.tsx
      /firmware.tsx
    /(garage)
      /_layout.tsx (garage stack)
      /index.tsx (garage home)
      /vehicle/[vehicleId].tsx
      /booking.tsx
    /(account)
      /_layout.tsx (account stack)
      /index.tsx (account home)
      /orders.tsx
      /addresses.tsx
      /settings.tsx
    /index.tsx (redirect to home)

/config
  /firebase.ts

/providers
  /AuthProvider.tsx
  /CartProvider.tsx
  /OBDProvider.tsx

/constants
  /theme.ts
```

## 4. Firebase Configuration

### 4.1 Firebase Project Details
```javascript
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

### 4.2 Authentication Configuration
```
Methods Enabled:
- Email/Password only
- Email verification required for purchases/actuations

User Roles (Custom Claims):
- user: Basic access
- owner: Vehicle owner privileges
- tech: Service technician access
- engineer: Full system access
```

## 5. Firebase Realtime Database Schema

### 5.1 Complete Database Structure
```json
{
  "reycinUSA": {
    "meta": {
      "appVersionMin": "string (semver)",
      "termsUrl": "string (URL)",
      "supportEmail": "string (email)",
      "maintenanceMode": "boolean",
      "announcement": "string (optional)"
    },

    "announcements": {
      "<announcementId>": {
        "title": "string",
        "tag": "News | Release | Event | Update",
        "heroImage": "string (URL)",
        "bodyMd": "string (markdown)",
        "createdAt": "number (timestamp)",
        "visible": "boolean",
        "priority": "number (0-10)"
      }
    },

    "catalog": {
      "categories": {
        "<categoryId>": {
          "name": "string",
          "order": "number",
          "icon": "string (lucide icon name)",
          "active": "boolean"
        }
      },
      "products": {
        "<productId>": {
          "category": "vehicles | parts | services | warranties | insurance",
          "name": "string",
          "subtitle": "string",
          "description": "string (markdown)",
          "media": ["string (URL)"],
          "price": "number",
          "currency": "USD | EUR | GBP",
          "specs": {
            "<specKey>": "string | number"
          },
          "options": {
            "<optionKey>": ["string"]
          },
          "compat": ["F300", "900", "900R"],
          "stock": "number",
          "sku": "string",
          "active": "boolean",
          "featured": "boolean"
        }
      }
    },

    "users": {
      "<uid>": {
        "email": "string",
        "displayName": "string",
        "role": "user | owner | tech | engineer",
        "createdAt": "number (timestamp)",
        "emailVerified": "boolean",
        "phoneNumber": "string (optional)",
        "country": "string (ISO code)",
        "vehicles": {
          "<vehicleId>": {
            "model": "F300 | 900 | 900R",
            "vin": "string",
            "year": "number",
            "color": "string",
            "purchaseDate": "number (timestamp)",
            "warrantyExpiry": "number (timestamp)"
          }
        },
        "addresses": {
          "<addressId>": {
            "label": "string",
            "line1": "string",
            "line2": "string (optional)",
            "city": "string",
            "state": "string",
            "country": "string",
            "postal": "string",
            "isDefault": "boolean"
          }
        },
        "preferences": {
          "notifications": "boolean",
          "newsletter": "boolean",
          "telemetrySharing": "boolean"
        }
      }
    },

    "orders": {
      "<orderId>": {
        "uid": "string (user ID)",
        "orderNumber": "string",
        "items": [
          {
            "productId": "string",
            "name": "string",
            "qty": "number",
            "price": "number",
            "options": {}
          }
        ],
        "subtotal": "number",
        "tax": "number",
        "shipping": "number",
        "total": "number",
        "currency": "string",
        "status": "quote | pending | paid | processing | shipped | delivered | canceled",
        "paymentMethod": "string",
        "shippingAddress": {},
        "billingAddress": {},
        "trackingNumber": "string (optional)",
        "notes": "string (optional)",
        "createdAt": "number (timestamp)",
        "updatedAt": "number (timestamp)"
      }
    },

    "cart": {
      "<uid>": {
        "items": {
          "<productId>": {
            "qty": "number",
            "options": {},
            "addedAt": "number (timestamp)"
          }
        },
        "updatedAt": "number (timestamp)"
      }
    },

    "obd": {
      "profiles": {
        "<profileId>": {
          "name": "string",
          "pollRateHz": "number (1-100)",
          "pids": ["string (hex PID codes)"],
          "mode08Controls": ["string"],
          "alertThresholds": {
            "rpm_max": "number",
            "ect_max": "number",
            "oil_pressure_min": "number"
          }
        }
      },
      "sessions": {
        "<sessionId>": {
          "uid": "string",
          "vehicleId": "string",
          "profileId": "string",
          "startedAt": "number (timestamp)",
          "endedAt": "number (timestamp) | null",
          "notes": "string",
          "tags": ["string"],
          "location": "string (optional)",
          "weather": "string (optional)",
          "logSummary": {
            "samples": "number",
            "durationSec": "number",
            "maxRpm": "number",
            "maxSpeed": "number",
            "avgFuelConsumption": "number",
            "dtcsFound": "number"
          }
        }
      },
      "sessionLogs": {
        "<sessionId>": {
          "<minuteBucket>": {
            "<timestamp>": {
              "rpm": "number",
              "ect_c": "number",
              "iat_c": "number",
              "map_kpa": "number",
              "vbat": "number",
              "speed_kmh": "number",
              "throttle_pct": "number",
              "fuel_level_pct": "number"
            }
          }
        }
      },
      "dtcs": {
        "<vehicleId>": {
          "active": ["string (DTC code)"],
          "pending": ["string (DTC code)"],
          "permanent": ["string (DTC code)"],
          "history": {
            "<timestamp>": {
              "codes": ["string"],
              "clearedBy": "string (uid)",
              "notes": "string"
            }
          },
          "lastScan": "number (timestamp)"
        }
      },
      "firmware": {
        "<vehicleId>": {
          "ecuModel": "string",
          "currentVersion": "string",
          "availableVersion": "string",
          "lastChecked": "number (timestamp)",
          "updateHistory": [
            {
              "from": "string",
              "to": "string",
              "timestamp": "number",
              "performedBy": "string (uid)"
            }
          ]
        }
      }
    },

    "serviceBookings": {
      "<bookingId>": {
        "uid": "string",
        "vehicleId": "string",
        "serviceId": "string",
        "dateISO": "string (YYYY-MM-DD)",
        "timeSlot": "string (HH:MM)",
        "status": "requested | confirmed | in_progress | completed | canceled",
        "technicianId": "string (optional)",
        "location": "string",
        "notes": "string",
        "estimatedCost": "number",
        "actualCost": "number (optional)",
        "createdAt": "number (timestamp)",
        "updatedAt": "number (timestamp)"
      }
    },

    "racingEvents": {
      "<eventId>": {
        "name": "string",
        "date": "string (ISO)",
        "location": "string",
        "type": "Track Day | Race | Exhibition",
        "results": [
          {
            "position": "number",
            "driverName": "string",
            "vehicleModel": "string",
            "lapTime": "string"
          }
        ],
        "status": "upcoming | live | completed",
        "streamUrl": "string (optional)"
      }
    }
  }
}
```

## 6. OBD Communication Protocol

### 6.1 Transport Methods
```
1. BLE (Bluetooth Low Energy)
   - Service UUID: 0xFFE0
   - Characteristic: 0xFFE1 (notify/write)
   - Device Name: REYCIN-OBD-XXXX

2. Wi-Fi WebSocket
   - Connection: ws://<dongle-ip>/ws
   - Port: 80 or 8080
   - Protocol: JSON over WebSocket

3. USB-Serial (Android Only)
   - Baud Rate: 115200
   - Data Bits: 8
   - Stop Bits: 1
   - Parity: None
```

### 6.2 Message Formats

#### App → Dongle Messages
```javascript
// Connection
{ 
  "type": "connect", 
  "profile": "string",
  "auth": "string (optional token)"
}

// Start Polling
{ 
  "type": "poll.start", 
  "rateHz": 10, 
  "pids": ["0C", "05", "0F", "2F", "10", "42"]
}

// Stop Polling
{ 
  "type": "poll.stop" 
}

// Mode 08 Control
{ 
  "type": "mode08", 
  "command": "fan_main | pump_aux | compressor | aero_flap", 
  "value": 0 | 1 
}

// DTC Operations
{ 
  "type": "dtc.read" 
}
{ 
  "type": "dtc.clear",
  "codes": ["P0128"] // optional specific codes
}

// Firmware Check
{ 
  "type": "firmware.check" 
}
```

#### Dongle → App Messages
```javascript
// Hello/Handshake
{ 
  "type": "hello", 
  "fw": "1.2.0", 
  "ecu": "ESP32-ECU-A1",
  "capabilities": ["obd2", "can", "mode08"]
}

// Telemetry Data
{ 
  "type": "telemetry", 
  "t": 1717420000123,
  "rpm": 3120,
  "ect_c": 84,
  "iat_c": 27,
  "map_kpa": 98,
  "vbat": 13.9,
  "speed_kmh": 45,
  "throttle_pct": 35
}

// DTC Response
{ 
  "type": "dtc", 
  "active": ["P0128", "P0113"],
  "pending": [],
  "permanent": []
}

// Acknowledgment
{ 
  "type": "ack", 
  "id": "mode08:fan_main", 
  "ok": true,
  "message": "string (optional)"
}

// Error
{ 
  "type": "error", 
  "code": "PID_TIMEOUT | CONNECTION_LOST | AUTH_FAILED | INVALID_COMMAND",
  "detail": "string"
}
```

### 6.3 PID Definitions
```
Standard OBD-II PIDs:
- 0C: Engine RPM
- 05: Engine Coolant Temperature
- 0F: Intake Air Temperature
- 2F: Fuel Level
- 10: MAF Air Flow Rate
- 42: Control Module Voltage
- 0D: Vehicle Speed
- 11: Throttle Position
- 04: Calculated Engine Load
- 0B: Intake Manifold Pressure
```

## 7. User Workflows

### 7.1 Authentication Flow
```
1. App Launch
   → Check Firebase Auth state
   → If not authenticated → Show Login Screen
   → If authenticated → Check email verification
   → If not verified → Show Verify Email Screen
   → If verified → Navigate to Home Tab

2. Registration
   → Enter email/password
   → Create Firebase Auth account
   → Send verification email
   → Create user profile in RTDB
   → Show Verify Email Screen

3. Login
   → Enter email/password
   → Authenticate with Firebase
   → Check email verification
   → Fetch user profile from RTDB
   → Navigate to Home Tab
```

### 7.2 Shopping Flow
```
1. Browse Products
   → Home Tab shows featured products
   → Shop Tab shows categories grid
   → Select category → Show products list
   → Select product → Show product details

2. Add to Cart
   → Select options (color, package, etc.)
   → Add to cart (updates RTDB cart/<uid>)
   → Show cart badge update

3. Checkout
   → Review cart items
   → Select/add shipping address
   → Select/add billing address
   → Create order with status "quote"
   → Show order confirmation (placeholder for payment)
```

### 7.3 OBD Session Flow
```
1. Connect to Dongle
   → Select transport method (BLE/Wi-Fi/USB)
   → Scan for devices
   → Connect to selected device
   → Receive hello message
   → Load OBD profile

2. Live Monitoring
   → Send poll.start with selected PIDs
   → Receive telemetry stream
   → Display real-time gauges
   → Monitor alert thresholds

3. Session Recording
   → Toggle "Session Mode"
   → Create session in RTDB
   → Buffer telemetry data
   → Batch upload to sessionLogs
   → Add session notes/tags

4. DTC Management
   → Send dtc.read command
   → Display active/pending codes
   → Lookup code descriptions
   → Optional: Clear codes (role-gated)
   → Log to RTDB history
```

### 7.4 Vehicle Management Flow
```
1. View Garage
   → List user's vehicles
   → Show vehicle cards with basic info

2. Vehicle Details
   → Show full specifications
   → Display maintenance schedule
   → Show warranty status
   → Link to recent OBD sessions
   → Service history

3. Book Service
   → Select service type
   → Choose date/time
   → Add notes
   → Create booking in RTDB
   → Receive confirmation
```

## 8. Security Rules

### 8.1 RTDB Security Rules Structure
```json
{
  "rules": {
    "reycinUSA": {
      "meta": {
        ".read": true
      },
      "announcements": {
        ".read": true
      },
      "catalog": {
        ".read": true
      },
      "users": {
        "$uid": {
          ".read": "$uid === auth.uid || auth.token.role === 'engineer'",
          ".write": "$uid === auth.uid || auth.token.role === 'engineer'"
        }
      },
      "orders": {
        "$orderId": {
          ".read": "data.child('uid').val() === auth.uid || auth.token.role === 'tech' || auth.token.role === 'engineer'",
          ".write": "auth.uid !== null && (newData.child('uid').val() === auth.uid || auth.token.role === 'engineer')"
        }
      },
      "cart": {
        "$uid": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      },
      "obd": {
        "profiles": {
          ".read": "auth.uid !== null"
        },
        "sessions": {
          "$sessionId": {
            ".read": "data.child('uid').val() === auth.uid || auth.token.role === 'tech' || auth.token.role === 'engineer'",
            ".write": "auth.uid !== null && (newData.child('uid').val() === auth.uid || auth.token.role === 'engineer')"
          }
        },
        "sessionLogs": {
          "$sessionId": {
            ".read": "root.child('reycinUSA/obd/sessions/' + $sessionId + '/uid').val() === auth.uid || auth.token.role === 'engineer'",
            ".write": "root.child('reycinUSA/obd/sessions/' + $sessionId + '/uid').val() === auth.uid"
          }
        },
        "dtcs": {
          "$vehicleId": {
            ".read": "auth.uid !== null",
            ".write": "auth.token.role === 'tech' || auth.token.role === 'engineer'"
          }
        },
        "firmware": {
          "$vehicleId": {
            ".read": "auth.uid !== null",
            ".write": "auth.token.role === 'engineer'"
          }
        }
      },
      "serviceBookings": {
        "$bookingId": {
          ".read": "data.child('uid').val() === auth.uid || auth.token.role === 'tech' || auth.token.role === 'engineer'",
          ".write": "auth.uid !== null && (newData.child('uid').val() === auth.uid || auth.token.role === 'tech' || auth.token.role === 'engineer')"
        }
      }
    }
  }
}
```

## 9. Error Handling

### 9.1 Error Types and Responses
```typescript
enum ErrorCode {
  // Auth Errors
  AUTH_INVALID_CREDENTIALS = "Invalid email or password",
  AUTH_EMAIL_NOT_VERIFIED = "Please verify your email first",
  AUTH_SESSION_EXPIRED = "Session expired, please login again",
  
  // Network Errors
  NETWORK_OFFLINE = "No internet connection",
  NETWORK_TIMEOUT = "Request timed out",
  
  // OBD Errors
  OBD_CONNECTION_FAILED = "Failed to connect to dongle",
  OBD_CONNECTION_LOST = "Connection to dongle lost",
  OBD_INVALID_RESPONSE = "Invalid response from dongle",
  OBD_PERMISSION_DENIED = "Bluetooth/USB permission denied",
  
  // Database Errors
  DB_PERMISSION_DENIED = "You don't have permission for this action",
  DB_WRITE_FAILED = "Failed to save data",
  DB_READ_FAILED = "Failed to load data",
  
  // Validation Errors
  VALIDATION_REQUIRED_FIELD = "This field is required",
  VALIDATION_INVALID_FORMAT = "Invalid format",
  VALIDATION_MIN_LENGTH = "Too short",
  VALIDATION_MAX_LENGTH = "Too long"
}
```

### 9.2 Error Recovery Strategies
```
1. Network Errors
   - Show offline banner
   - Queue operations for retry
   - Auto-retry with exponential backoff
   - Sync when connection restored

2. OBD Connection Errors
   - Auto-reconnect attempts (3x)
   - Fallback to different transport
   - Clear connection state
   - Show troubleshooting guide

3. Auth Errors
   - Clear invalid tokens
   - Redirect to login
   - Preserve navigation state
   - Restore after re-auth

4. Data Errors
   - Show user-friendly message
   - Log technical details
   - Offer retry action
   - Fallback to cached data
```

## 10. Performance Specifications

### 10.1 Target Metrics
```
App Launch:
- Cold start: < 3 seconds
- Warm start: < 1 second
- Time to interactive: < 2 seconds

Navigation:
- Tab switch: < 100ms
- Screen transition: < 200ms
- List scrolling: 60 FPS

OBD Performance:
- Connection time: < 5 seconds
- Data latency: < 100ms
- Telemetry rate: 10-100 Hz
- Session buffer: 10,000 samples

Data Loading:
- Initial catalog: < 2 seconds
- Product images: Progressive loading
- Cart updates: < 500ms
- Order creation: < 1 second
```

### 10.2 Optimization Strategies
```
1. Code Splitting
   - Lazy load tabs
   - Dynamic imports for heavy screens
   - Separate OBD modules

2. Caching
   - React Query cache (5 minutes)
   - Image cache (expo-image)
   - Session data buffer
   - Offline RTDB persistence

3. Data Management
   - Paginate large lists
   - Virtual scrolling for logs
   - Batch RTDB writes
   - Debounce search inputs

4. Asset Optimization
   - WebP images where supported
   - Multiple resolutions
   - Lazy load below fold
   - Preload critical assets
```

## 11. Testing Requirements

### 11.1 Test Coverage Areas
```
Unit Tests:
- Auth functions
- Cart calculations
- OBD data parsing
- Form validations

Integration Tests:
- Firebase Auth flow
- RTDB operations
- OBD connection
- Order creation

E2E Tests:
- Complete user registration
- Full shopping flow
- OBD session recording
- Service booking

Performance Tests:
- App launch time
- Screen render time
- Memory usage
- Battery consumption
```

### 11.2 Test Data Requirements
```
Mock Users:
- test-user@reycin.com (basic user)
- test-owner@reycin.com (vehicle owner)
- test-tech@reycin.com (technician)
- test-engineer@reycin.com (engineer)

Mock Vehicles:
- F300 (VIN: RXF3000001)
- 900 (VIN: RX9000001)
- 900R (VIN: RX9R00001)

Mock OBD Data:
- Sample telemetry streams
- DTC code sets
- Session recordings
- Firmware versions
```

## 12. Deployment Configuration

### 12.1 Environment Variables
```
Production:
FIREBASE_API_KEY=AIzaSyCWsh5wSHSIBwndmcSqhh5c9jwGZeIwlDQ
FIREBASE_AUTH_DOMAIN=xappstore-533b8.firebaseapp.com
FIREBASE_DATABASE_URL=https://xappstore-533b8-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=xappstore-533b8
FIREBASE_STORAGE_BUCKET=xappstore-533b8.appspot.com
FIREBASE_MESSAGING_SENDER_ID=996074459120
FIREBASE_APP_ID=1:996074459120:web:bb2ef275f6dc308eb89735

OBD_BLE_SERVICE_UUID=0xFFE0
OBD_BLE_CHAR_UUID=0xFFE1
OBD_WEBSOCKET_PORT=8080
OBD_SERIAL_BAUD=115200
```

### 12.2 Build Configuration
```
iOS:
- Minimum iOS: 15.0
- Supported devices: iPhone 6s+
- Orientations: Portrait only
- Capabilities: Bluetooth, Network

Android:
- Minimum SDK: 29 (Android 10)
- Target SDK: 34 (Android 14)
- Permissions: BLUETOOTH, INTERNET, USB
- ProGuard: Enabled for release
```

## 13. Maintenance & Updates

### 13.1 Update Strategy
```
1. App Updates
   - Check version on launch
   - Show update prompt if required
   - Force update for breaking changes
   - Optional update for features

2. Content Updates
   - Real-time from RTDB
   - No app update required
   - Cached for offline

3. Firmware Updates
   - Check ECU version
   - Download from CDN
   - Apply via OBD connection
   - Verify and log
```

### 13.2 Analytics & Monitoring
```
Track:
- User engagement metrics
- Feature usage statistics
- OBD session frequency
- Error rates and types
- Performance metrics
- Crash reports

Tools:
- Firebase Analytics (built-in)
- Custom RTDB logging
- Error boundaries
- Performance monitoring
```

## 14. Compliance & Legal

### 14.1 Data Privacy
```
- GDPR compliant
- User data encryption
- Right to deletion
- Data portability
- Consent management
```

### 14.2 Terms & Conditions
```
Required Agreements:
- Terms of Service
- Privacy Policy
- EULA
- Warranty Terms
- Service Agreement
```

## 15. Future Enhancements (Roadmap)

### Phase 2 Features
```
- Payment processing integration
- Push notifications
- Social features (owner community)
- Track day leaderboards
- Remote diagnostics
- Predictive maintenance
- AR vehicle visualization
- Voice commands
- Apple CarPlay / Android Auto
```

### Phase 3 Features
```
- AI-powered driving coach
- Telemetry analysis
- Custom tuning profiles
- Parts marketplace
- Service scheduling AI
- Insurance integration
- Fleet management
- Racing team features
```

---

## Appendix A: Component Specifications

### A.1 Reusable Components
```typescript
// Button Component
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: string; // Lucide icon name
}

// Card Component
interface CardProps {
  title?: string;
  subtitle?: string;
  image?: string;
  onPress?: () => void;
  variant?: 'default' | 'hero' | 'compact';
}

// Input Component
interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
}

// Gauge Component (for OBD)
interface GaugeProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  alertThreshold?: number;
  variant?: 'circular' | 'linear' | 'digital';
}
```

### A.2 Screen Templates
```typescript
// List Screen Template
interface ListScreenProps<T> {
  data: T[];
  renderItem: (item: T) => ReactElement;
  onRefresh?: () => void;
  onEndReached?: () => void;
  emptyMessage?: string;
  loading?: boolean;
}

// Detail Screen Template
interface DetailScreenProps {
  headerImage?: string;
  title: string;
  subtitle?: string;
  sections: Array<{
    title: string;
    content: ReactElement;
  }>;
  actions?: Array<{
    title: string;
    onPress: () => void;
  }>;
}

// Form Screen Template
interface FormScreenProps {
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'email' | 'password' | 'number' | 'select';
    validation?: any; // Zod schema
  }>;
  onSubmit: (data: any) => void;
  submitLabel?: string;
}
```

---

This specification document serves as the complete blueprint for the Reycin USA mobile application. All development should strictly adhere to these specifications to ensure consistency, quality, and maintainability.

Last Updated: 2025-01-09
Version: 1.0.0