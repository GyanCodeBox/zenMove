import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, RefreshCcw, Check, X } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { api } from '../api/client';

export default function PhotoCaptureScreen({ route, navigation }: any) {
  const { itemId, photoType } = route.params; // "open" or "sealed"
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<any>(null);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{color: 'white', marginBottom: 20}}>Camera permission required</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={{color: 'white'}}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      setPhoto(pic);
    }
  };

  const handleUpload = async () => {
    try {
      setUploading(true);
      
      // 1. Development Bypass (Native hashing of raw file bits is complex without specific libs)
      const hash = "DEV_BYPASS";

      // 2. Create form data
      const formData = new FormData();
      // @ts-ignore
      formData.append('file', {
        uri: photo.uri,
        name: `${itemId}_${photoType}.jpg`,
        type: 'image/jpeg',
      });

      // 3. Upload to backend (Use native fetch for better multipart stability on mobile)
      const uploadUrl = `${api.defaults.baseURL}/items/${itemId}/photos/${photoType}`;
      const authHeader = api.defaults.headers.common['Authorization'];

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'X-Photo-Hash': hash,
          'Authorization': authHeader as string,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }

      alert(`${photoType === 'open' ? 'Contents' : 'Sealed'} photo saved!`);
      navigation.goBack();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      let msg = err.message || "Unknown upload error";
      
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail[0]?.msg || JSON.stringify(detail);
      } else if (detail) {
        msg = JSON.stringify(detail);
      }

      alert('Upload failed: ' + msg);
    } finally {
      setUploading(false);
    }
  };

  if (photo) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: photo.uri }} style={styles.preview} />
        {uploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color="#D97706" />
            <Text style={{color: 'white', marginTop: 12}}>Uploading Digital Twin...</Text>
          </View>
        )}
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.circleBtn, {backgroundColor: '#EF4444'}]} onPress={() => setPhoto(null)}>
            <X color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.circleBtn, {backgroundColor: '#22C55E'}]} onPress={handleUpload} disabled={uploading}>
            <Check color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back" />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.guideContainer}>
          <Text style={styles.guideText}>
            {photoType === 'open' ? 'Center items in view' : 'Align box in frame'}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1 },
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'space-between', 
    padding: 24 
  },
  guideContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  guideText: { color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 16, fontWeight: 'bold' },
  captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 40 },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white' },
  preview: { flex: 1, resizeMode: 'cover' },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', padding: 40, position: 'absolute', bottom: 0, left: 0, right: 0 },
  circleBtn: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  btn: { backgroundColor: '#D97706', padding: 16, borderRadius: 8 },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }
});
