import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { api } from '../api/client';

export default function ScannerScreen({ route, navigation }: any) {
  const { mode, moveId, itemId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View style={styles.container}><Text style={styles.text}>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    setScanned(true);
    try {
      if (mode === 'bind' && itemId) {
        await api.post(`/items/${itemId}/bind-qr`, { qr_code: data, tag_tier: 'PVC' });
        alert(`Successfully bound QR sequence ${data}!`);
        navigation.goBack(); // Return to manifest
      } else if (mode === 'load' && moveId) {
        await api.post(`/moves/${moveId}/scan`, { qr_code: data, condition_post: 'good' });
        alert(`Successfully loaded item ${data} onto truck!`);
        setTimeout(() => setScanned(false), 2000); // Reset for next scan
      } else if (mode === 'unload' && moveId) {
        await api.post(`/moves/${moveId}/scan`, { qr_code: data, condition_post: 'good' });
        alert(`Successfully UNLOADED item ${data}. Condition: GOOD`);
        setTimeout(() => setScanned(false), 2000); 
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let msg = "Scan verification failed.";
      
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        // Extract the human-readable 'msg' from the first validation error
        msg = detail[0]?.msg || JSON.stringify(detail);
      } else if (detail) {
        msg = JSON.stringify(detail);
      }

      alert(msg);
      setTimeout(() => setScanned(false), 1500);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      {/* Move overlay outside CameraView as children are deprecated */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.scanTarget} />
      </View>
      {scanned && (
        <TouchableOpacity style={styles.button} onPress={() => setScanned(false)}>
          <Text style={styles.buttonText}>Tap to Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  text: {
    color: 'white',
    textAlign: 'center',
    margin: 20,
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTarget: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#D97706',
    backgroundColor: 'transparent',
  },
  button: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    backgroundColor: '#D97706',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
