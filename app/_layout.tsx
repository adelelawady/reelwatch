import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <>
      <StatusBar hidden />
      <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
    </>
  );
}
