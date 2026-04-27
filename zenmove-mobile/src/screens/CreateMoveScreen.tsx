import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { api } from '../api/client';

export default function CreateMoveScreen({ navigation }: any) {
  const [originAddress, setOriginAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [originCityCode, setOriginCityCode] = useState('BBS');
  const [destCityCode, setDestCityCode] = useState('BLR');
  const [loading, setLoading] = useState(false);

  const handleCreateRequest = async () => {
    if (!originAddress || !destAddress) return alert("Please enter addresses");
    
    try {
      setLoading(true);
      
      const payload = {
        origin_address: originAddress,
        dest_address: destAddress,
        origin_city_code: originCityCode.toUpperCase() || 'BBS',
        dest_city_code: destCityCode.toUpperCase() || 'BLR',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        quote_amount: 15000, 
      };

      await api.post('/moves', payload);
      alert('Move successfully quoted & booked!');
      navigation.goBack();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create move');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Schedule Move</Text>
        <Text style={styles.subtitle}>Enter the pickup and drop details for an instant quote.</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Origin Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="E.g., Plot 12, Saheed Nagar" 
            placeholderTextColor="#64748B"
            value={originAddress}
            onChangeText={setOriginAddress}
          />

          <Text style={styles.label}>Origin City Code (3 Letters)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="BBS" 
            placeholderTextColor="#64748B"
            maxLength={3}
            value={originCityCode}
            onChangeText={setOriginCityCode}
          />

          <Text style={styles.label}>Destination Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="E.g., Koramangala 5th Block" 
            placeholderTextColor="#64748B"
            value={destAddress}
            onChangeText={setDestAddress}
          />

          <Text style={styles.label}>Destination City Code (3 Letters)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="BLR" 
            placeholderTextColor="#64748B"
            maxLength={3}
            value={destCityCode}
            onChangeText={setDestCityCode}
          />

          <TouchableOpacity style={styles.button} onPress={handleCreateRequest} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Get Quote & Book</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 24, paddingTop: 40 },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 14, marginTop: 8, marginBottom: 24 },
  formGroup: { backgroundColor: '#1E293B', padding: 20, borderRadius: 12 },
  label: { color: '#94A3B8', marginBottom: 8, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  input: { backgroundColor: '#0F172A', color: 'white', padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 16 },
  button: { backgroundColor: '#D97706', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
