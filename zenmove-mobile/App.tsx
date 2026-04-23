import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ScannerScreen from './src/screens/ScannerScreen';

const Stack = createNativeStackNavigator();

// Temporary Placeholder for Customer flow
function CustomerHomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 20 }}>Welcome Customer!</Text>
      <Text style={{ color: '#94A3B8', marginTop: 10 }}>Customer features go here...</Text>
    </View>
  );
}

export default function App() {
  const [authState, setAuthState] = useState({ authenticated: false, role: 'customer' });

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#fff',
            headerShadowVisible: false,
          }}
        >
          {!authState.authenticated ? (
            // User is NOT logged in -- Show ONLY the Login Stack
            <>
              <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                initialParams={{ setAuthState }}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Register" 
                component={require('./src/screens/RegisterScreen').default} 
                initialParams={{ setAuthState }}
                options={{ headerShown: false }}
              />
            </>
          ) : authState.role === 'packer' ? (
            // User IS logged in AND is a Packer
            <>
              <Stack.Screen 
                name="PackerDashboard" 
                component={DashboardScreen} 
                initialParams={{ setAuthState }}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="PackerMoveDetail" 
                component={require('./src/screens/PackerMoveDetailScreen').default} 
                options={{ title: 'Manifest Manager', headerBackTitle: 'Jobs' }}
              />
              <Stack.Screen 
                name="Scanner" 
                component={ScannerScreen} 
                options={{ title: 'Scan Barcodes', headerBackTitle: 'Back' }}
              />
              <Stack.Screen 
                name="PhotoCapture" 
                component={require('./src/screens/PhotoCaptureScreen').default} 
                options={{ title: 'Digital Twin Photo', headerTintColor: 'white', headerStyle: { backgroundColor: 'black' } }}
              />
              <Stack.Screen 
                name="DispatchSummary" 
                component={require('./src/screens/DispatchSummaryScreen').default} 
                options={{ title: 'Manifest Audit', headerBackTitle: 'Back' }}
              />
            </>
          ) : (
            // User IS logged in AND is a Customer
            <>
              <Stack.Screen 
                name="CustomerDashboard" 
                component={require('./src/screens/CustomerDashboardScreen').default} 
                initialParams={{ setAuthState }}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="CreateMove" 
                component={require('./src/screens/CreateMoveScreen').default} 
                options={{ title: 'New Reservation', headerBackTitle: 'Back' }}
              />
              <Stack.Screen 
                name="CustomerMoveDetail" 
                component={require('./src/screens/CustomerMoveDetailScreen').default} 
                options={{ title: 'Move Tracker' }}
              />
              <Stack.Screen 
                name="EscrowLedger" 
                component={require('./src/screens/EscrowLedgerScreen').default} 
                options={{ title: 'Asset Vault Ledger', headerBackTitle: 'Back' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
