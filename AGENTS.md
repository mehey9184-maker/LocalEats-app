# LocalEats Agent Instructions & Architecture Document

> **CRITICAL RULE FOR THE AI AGENT**: 
> 1. You MUST ALWAYS consult this document BEFORE making any fixes, modifications, or starting new phases.
> 2. You MUST ALWAYS update this document AFTER completing a phase or making significant functional changes to keep it current.
> 3. **Documentation Check**: Before performing any file edits, always read LocalEats_App_Functionality_Documentation.md. After completing an edit, update the documentation file to reflect the new state of the application.

## Application Overview
**LocalEats** is a comprehensive food discovery and ordering app for local legendary Kota joints. It features user authentication, profile setup, smart dispatch, and a seamless checkout experience with real-time live map tracking.

## Core Application Functions & State
- **Map System**: Uses `react-leaflet` with custom interactive SVG icons.
  - **Customer**: Blue Pin with a pulsing live radar beacon (`userMapIcon`).
  - **Open Store**: Vibrant Orange Pin with storefront emblem and verified active badge (`createShopMapIcon(true)`).
  - **Closed Store**: Muted slate gray pin with offline status (`createShopMapIcon(false)`).
  - **Live Couriers**: Indigo Pin with dynamic vehicle badges and live proximity markers.
- **Map Behavior**: Shops missing coordinates use a deterministic scattering algorithm to avoid stacking on a single pixel. User location pin is strictly enforced to always render on top (`z-index: 2000`).
- **Data/Backend**: Uses Supabase for realtime tracking (e.g., `rider_locations`, `orders` tables) and data fetching.
- **Smart Dispatch**: Riders are dynamically assigned based on proximity to the shop using the `calculateDistance` utility.
- **Order Tracking Phases**: Order tracking UI is split into strict phases: Live Delivery, Ready, Rider Approach, Cooking, Completed, and Pending.

## Phase & Fix History

### Phase 5: Trust Anchors, Map Icon Standardization & UX Psychology
- **Map Pin System & Icon Alignment**: Standardized pins across Explore, Discover, Address Selection, and Order Tracking views. Eliminated visual mixups between users, riders, and stores.
- **Interactive Map Legend & Real-Time Filtering**:
  - Integrated the live courier category into the floating map legend alongside customer and store filters.
  - Enabled 1-tap filtering to isolate open spots, closed spots, couriers, or the customer's delivery destination.
  - Synchronized location picker tooltips to match the visual styling of the pins.

### Pre-Phase 6: Critical Map Fixes
- **Coordinate Stacking Fix**: Resolved an issue where the user's location and shops without coordinates would fight for the same default map pixel, causing visual overlapping.
