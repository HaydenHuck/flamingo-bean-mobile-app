# Flamingo Bean App

Flamingo Bean is a production-minded mobile ordering system for a real coffee business. The repository is organized as a small monorepo with a customer app, staff dashboard, and backend API.

## Project Structure

- `backend/`: FastAPI API with MySQL persistence, Square sandbox checkout, Square webhook confirmation, Firebase customer token verification, JWT admin authentication, products, orders, and admin routes.
- `mobile/`: Expo React Native + TypeScript customer app for browsing products, optional Firebase customer accounts, cart, Square checkout, My Orders, and order tracking.
- `admin/`: React + TypeScript Vite web dashboard for cafe staff to manage orders and products.

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy, MySQL, Firebase Admin, JWT auth.
- Customer app: React Native, Expo, TypeScript, Firebase Auth.
- Staff dashboard: React, Vite, TypeScript.
- Payments: Square sandbox hosted checkout and webhook payment confirmation.

## Current MVP Features

- Customer menu browsing and product details.
- Cart, quantity controls, and Square-hosted sandbox checkout.
- Optional customer email/password accounts with Firebase Auth.
- Logged-in customer My Orders views backed by MySQL orders.
- Token-protected guest order tracking with payment and fulfillment status refresh.
- Protected admin login.
- Staff order list, order detail, and order status updates.
- Staff product list, add/edit product, and enable/disable product.

## Local Development

1. Start the backend from `backend/` after configuring `backend/.env`.
2. Start the customer app from `mobile/` with Expo.
3. Start the staff dashboard from `admin/` with Vite.

Each app has its own README with setup and run instructions.

