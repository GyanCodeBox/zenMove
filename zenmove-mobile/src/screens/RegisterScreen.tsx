import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { api } from '../api/client';

export default function RegisterScreen({ navigation, route }: any) {
  const { setAuthState } = route.params;
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'customer' | 'packer'>('customer');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    try {
      setError('');
      // 1. Register the exact same way web does
      await api.post('/auth/register', { 
        phone, password, full_name: fullName, role 
      });
      // 2. Immediately Login
      const res = await api.post('/auth/login', { phone, password });
      const payloadData = res.data?.data || res.data;
      
      api.defaults.headers.common['Authorization'] = `Bearer ${payloadData.access_token}`;
      setAuthState({ authenticated: true, role: payloadData.user.role.toLowerCase() });
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join ZenMove today.</Text>

          <View style={styles.form}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} onChangeText={setFullName} placeholder="John Doe" placeholderTextColor="#64748B" />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} onChangeText={setPhone} keyboardType="phone-pad" placeholder="9876543210" placeholderTextColor="#64748B" />

            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} secureTextEntry onChangeText={setPassword} placeholder="********" placeholderTextColor="#64748B" />

            <Text style={styles.label}>Account Role</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity style={[styles.roleBtn, role === 'customer' && styles.roleActive]} onPress={() => setRole('customer')}>
                <Text style={styles.roleText}>Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.roleBtn, role === 'packer' && styles.roleActive]} onPress={() => setRole('packer')}>
                <Text style={styles.roleText}>Packer</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
              <Text style={styles.linkText}>Already have an account? Sign in.</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 32, paddingTop: 64 },
  title: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 16, marginBottom: 32 },
  form: { backgroundColor: '#1E293B', padding: 24, borderRadius: 16 },
  errorText: { color: '#EF4444', marginBottom: 16, textAlign: 'center', fontWeight: 'bold' },
  label: { color: '#94A3B8', marginBottom: 8, fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: '#0F172A', color: 'white', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: 16 },
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  roleBtn: { flex: 1, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  roleActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  roleText: { color: 'white', fontWeight: 'bold' },
  button: { backgroundColor: '#D97706', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#D97706', fontWeight: 'bold' }
});
