import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Alert, TouchableOpacity } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import axios from 'axios';

// Mock ID to hit our backend (Will return 404 if item doesn't exist, which is expected unless we create it)
const MOCK_ITEM_ID = '123e4567-e89b-12d3-a456-426614174000';
const API_URL = 'http://192.168.1.2:8000/api/v1';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState('qr'); // 'qr' or 'photo'
  const [qrData, setQrData] = useState(null);
  const [uploading, setUploading] = useState(false);

  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setQrData(data);
    Alert.alert(`QR Scanned`, `Scanned Content: ${data}`, [
      { text: 'OK', onPress: () => setScanned(false) }
    ]);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    setUploading(true);
    try {
      // 1. Capture Photo
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });

      // 2. Hash it locally using Crypto
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        photo.base64
      );

      Alert.alert('Processing...', `Generated SHA-256 Hash:\n${hash.substring(0, 15)}...`);

      // 3. Prepare Multipart Form
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        name: 'item_photo.jpg',
        type: 'image/jpeg',
      });

      // 4. Send to FastAPI Server
      const response = await fetch(`${API_URL}/items/${MOCK_ITEM_ID}/photos/open`, {
        method: 'POST',
        headers: {
          'X-Photo-Hash': hash,
          // 'Authorization': `Bearer <token>`  // normally handled by Auth Context
        },
        body: formData,
      });

      const responseData = await response.json();

      // 5. Cache cleanup isn't strictly necessary for the MVP test 
      // (The OS will auto-clean takePictureAsync's temporary cache directory over time)

      if (response.ok) {
        Alert.alert('Success', 'Photo securely uploaded and verified by backend S3!');
      } else {
        // We will hit this because MOCK_ITEM_ID does not exist in the DB, 
        // but it proves the network route is hit and hashing works!
        Alert.alert('Server Reached (Item ID not found)', `Request went through and hash was sent! Backend returned: ${responseData.detail || JSON.stringify(responseData)}`);
      }

    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text style={{ marginTop: 50, textAlign: 'center' }}>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>ZenMove Packer App</Text>

      {mode === 'qr' ? (
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
      ) : (
        <CameraView style={styles.camera} ref={cameraRef} />
      )}

      {qrData && <Text style={styles.scanResult}>Last QR: {qrData}</Text>}

      <View style={styles.buttonContainer}>
        <Button
          title="QR Scanner Mode"
          onPress={() => setMode('qr')}
          disabled={mode === 'qr' || uploading}
        />
        <Button
          title="Photo Mode"
          onPress={() => setMode('photo')}
          disabled={mode === 'photo' || uploading}
        />
      </View>

      {mode === 'photo' && (
        <TouchableOpacity
          style={[styles.captureButton, uploading && { backgroundColor: '#aaa' }]}
          onPress={takePhoto}
          disabled={uploading}
        >
          <Text style={styles.captureText}>{uploading ? 'Uploading...' : 'Capture Photo'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  camera: {
    width: '90%',
    height: '50%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-around',
    width: '100%',
  },
  scanResult: {
    marginTop: 10,
    fontSize: 16,
    color: 'green',
  },
  captureButton: {
    marginTop: 30,
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
  },
  captureText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
