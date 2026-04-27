import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Camera, Package, Check } from 'lucide-react-native';
import { api } from '../api/client';

export default function ScannerScreen({ route, navigation }: any) {
  const { mode, moveId, itemId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const cameraRef = useRef<any>(null);

  // Super Fast Mode states
  const [step, setStep] = useState<'qr' | 'photo'>('qr');
  const [currentQr, setCurrentQr] = useState('');
  const [itemsAdded, setItemsAdded] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

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
    if (scanned || step !== 'qr') return;
    setScanned(true);

    try {
      if (mode === 'rapid_pack' && moveId) {
        // STEP 1: Scan QR -> Instant switch to camera mode
        setCurrentQr(data);
        setStep('photo');
        setScanned(false);
        return;
      }
      
      if (mode === 'load' && moveId) {
        // STEP 5: Loading Scan -> ONLY Scan QR -> marks loaded
        await api.post(`/moves/${moveId}/scan`, { qr_code: data, condition_post: 'good' });
        showToast(`Loaded: ${data}`);
        setTimeout(() => setScanned(false), 500); // Continuous loop!
        return;
      } 
      
      if (mode === 'unload' && moveId) {
        // STEP 6: Unloading Scan -> ONLY Scan QR -> marks delivered
        await api.post(`/moves/${moveId}/scan`, { qr_code: data, condition_post: 'good' });
        showToast(`Unloaded: ${data}`);
        setTimeout(() => setScanned(false), 500); // Continuous loop!
        return;
      } 
      
      if (mode === 'bind' && itemId) {
        await api.post(`/items/${itemId}/bind-qr`, { qr_code: data, tag_tier: 'PVC' });
        alert(`Successfully bound QR sequence ${data}!`);
        navigation.goBack();
      } 
      
      if (mode === 'customer_audit' && moveId) {
        const res = await api.get(`/items/by-qr/${data}`);
        const item = res.data.data;
        if (item.move_id !== moveId) {
            alert("This item doesn't belong to your current move.");
            setTimeout(() => setScanned(false), 2000);
            return;
        }
        navigation.navigate('ItemAudit', { item });
        setScanned(false);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      let msg = err.message || "Scan verification failed.";
      
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail[0]?.msg || JSON.stringify(detail);
      } else if (detail) {
        msg = JSON.stringify(detail);
      }

      showToast(`Error: ${msg}`);
      setTimeout(() => setScanned(false), 1500);
      setStep('qr'); // Reset if failed
    }
  };

  const handleTakeRapidPhoto = async () => {
    if (!cameraRef.current || uploading) return;
    try {
      setUploading(true);
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });

      // STEP 2 & 3: Auto Confirmation & Continuous Loop
      // 1. implicitly create item
      const itemRes = await api.post(`/moves/${moveId}/items`, {
        name: `Box #${itemsAdded + 1}`,
        volume_cft: 2.0,
        has_photos: true,
        condition_pre: 'good',
        is_high_risk: false
      });
      const newItem = itemRes.data.data;

      // 2. bind QR
      await api.post(`/items/${newItem.id}/bind-qr`, { qr_code: currentQr, tag_tier: 'PVC' });

      // 3. sync photo
      const formData = new FormData();
      // @ts-ignore
      formData.append('file', {
        uri: pic.uri,
        name: `${newItem.id}_sealed.jpg`,
        type: 'image/jpeg',
      });
      const uploadUrl = `${api.defaults.baseURL}/items/${newItem.id}/photos/sealed`;
      const authHeader = api.defaults.headers.common['Authorization'];

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'X-Photo-Hash': 'DEV_BYPASS', 'Authorization': authHeader as string },
        body: formData,
      });

      if (!response.ok) throw new Error("Photo upload failed");

      // Success -> Reset step to QR -> Show lightweight toast -> Bump count
      setItemsAdded(prev => prev + 1);
      showToast("✅ Item Added");
      setStep('qr');
      
    } catch (e: any) {
      alert("Failed to save item: " + e.message);
      setStep('qr');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        ref={cameraRef} 
        facing="back" 
        barcodeScannerSettings={step === 'qr' ? { barcodeTypes: ["qr"] } : undefined}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        
        {/* Dynamic Instructional Banner */}
        <View style={styles.guideContainer}>
          <Text style={styles.guideText}>
            {mode === 'rapid_pack' && step === 'photo' ? 'Take photo of the sealed box' :
             mode === 'rapid_pack' && step === 'qr' ? 'Scan next QR sticker' :
             mode === 'load' ? 'Scan items onto truck' :
             mode === 'unload' ? 'Scan items to unload' :
             'Scan QR code'}
          </Text>
        </View>

        {/* Rapid Pack Photo Button Layer */}
        {mode === 'rapid_pack' && step === 'photo' && (
          <View style={styles.controls}>
            {uploading ? (
              <View style={styles.uploadingBox}>
                <ActivityIndicator color="white" />
                <Text style={{color: 'white', marginTop: 8}}>Saving Item...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.captureBtn} onPress={handleTakeRapidPhoto}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Temporary Notification Toast */}
        {toast ? (
          <View style={styles.toastBox}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}

        {/* STEP 4: Quick Summary */}
        {(mode === 'rapid_pack' || mode === 'load' || mode === 'unload') && (
          <View style={styles.summaryBar}>
            <Package color="white" size={16} style={{marginRight: 8}} />
            <Text style={styles.summaryText}>
              {mode === 'rapid_pack' ? `${itemsAdded} items added this session` : 'Continuous Scan Mode Active'}
            </Text>
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  text: { color: 'white', fontSize: 16 },
  camera: { flex: 1 },
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'space-between', 
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40
  },
  guideContainer: { alignItems: 'center' },
  guideText: { backgroundColor: 'rgba(15, 23, 42, 0.8)', color: 'white', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, fontSize: 16, fontWeight: 'bold', overflow: 'hidden' },
  controls: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
  captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white' },
  uploadingBox: { backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: 20, borderRadius: 16, alignItems: 'center' },
  toastBox: { position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: '#22C55E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  toastText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  summaryBar: { position: 'absolute', bottom: 30, flex: 1, left: 24, right: 24, backgroundColor: 'rgba(15, 23, 42, 0.8)', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12 },
  summaryText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  button: { marginTop: 20, backgroundColor: '#3B82F6', padding: 12, borderRadius: 8 },
  buttonText: { color: 'white', fontWeight: 'bold' }
});
