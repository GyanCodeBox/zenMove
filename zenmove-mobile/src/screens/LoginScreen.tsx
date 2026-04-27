import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { api } from '../api/client';

export default function LoginScreen({ navigation, route }: any) {
  const { setAuthState } = route.params; // passed from App.tsx
  const [phone, setPhone] = useState('9999999999');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      // Hit real backend
      const res = await api.post('/auth/login', { phone, password });
      
      const payloadData = res.data?.data || res.data; // Handle FastAPI nested vs un-nested
      const access_token = payloadData?.access_token;
      const userRole = String(payloadData?.user?.role || 'customer').toLowerCase();
      
      // Inject token globally for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      console.log("LOGGED IN AS:", userRole)
      // Tell App navigation that we are logged in, and pass the user role!
      setAuthState({ authenticated: true, role: userRole });
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>ZM</Text>
          </View>
          <Text style={styles.title}>ZenMove</Text>
          <Text style={styles.subtitle}>Trust-Tech Logistics</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <Text style={styles.label}>Phone Number</Text>
          <TextInput 
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="9999999999"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="********"
            placeholderTextColor="#64748B"
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }} onPress={() => navigation.navigate('Register')}>
            <Text style={{ color: '#D97706', fontWeight: 'bold' }}>Create new account</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flex: 1, justifyContent: 'center', padding: 32 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoBox: { backgroundColor: '#D97706', padding: 12, borderRadius: 16, marginBottom: 16 },
  logoText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  title: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#94A3B8', fontSize: 16 },
  form: { backgroundColor: '#1E293B', padding: 24, borderRadius: 16 },
  errorText: { color: '#EF4444', marginBottom: 16, textAlign: 'center', fontWeight: 'bold' },
  label: { color: '#94A3B8', marginBottom: 8, fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: '#0F172A', color: 'white', padding: 16, borderRadius: 8, marginBottom: 24, fontSize: 16 },
  button: { backgroundColor: '#D97706', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
