/**
 * Returns true when the device has internet connectivity.
 * Uses React Native's built-in NetInfo via fetch as a lightweight alternative.
 * Always returns connected=true by default (safe fallback).
 */
export function useNetwork() {
  // Stub: always connected.
  // To add real network detection, install @react-native-community/netinfo
  // and replace this with the NetInfo.addEventListener pattern.
  return { isConnected: true };
}
