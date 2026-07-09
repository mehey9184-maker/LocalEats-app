#!/bin/bash
# Find the main return statement of CheckoutScreen
grep -n "return (" src/screens/CheckoutScreen.tsx | head -n 1
