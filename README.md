# LocalEats - Local's Legendary Kota Joints

A comprehensive food discovery and ordering app for local legendary Kota joints, featuring user authentication, profile setup, and a seamless checkout experience.

## 🚀 Deployment Guide

This app is built with **React**, **Vite**, and **Tailwind CSS**, using **Supabase** for the backend.

### 1. Environment Variables

Before deploying, ensure you have the following environment variables set up in your hosting provider (Vercel, Netlify, etc.):

- `VITE_SUPABASE_URL`: Your Supabase Project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anonymous API Key.
- `GEMINI_API_KEY`: Your Google Gemini API Key (if using AI features).

### 2. Build and Deploy

#### **Vercel / Netlify**
1. Connect your repository.
2. Set the build command to: `npm run build`
3. Set the output directory to: `dist`
4. Add the environment variables listed above.

#### **GitHub Pages**
1. Update `vite.config.ts` to include `base: '/your-repo-name/'`.
2. Run `npm run build`.
3. Deploy the contents of the `dist` folder to the `gh-pages` branch.

### 3. Database Setup

Ensure your Supabase database has the required tables. You can find the SQL setup script in the app's "Manual Setup" section on the Home screen.

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS 4
- **Backend:** Supabase (Auth, Firestore)
- **Animations:** Motion (Framer Motion)
- **Icons:** Lucide React, Material Symbols

## 📱 Features

- **Store Discovery:** Search and filter local Kota joints.
- **Real-time Orders:** Track your order status as it changes.
- **User Profiles:** Manage your delivery address and preferences.
- **Secure Checkout:** Seamless ordering process.
- **AI Integration:** Powered by Google Gemini for smart recommendations.
