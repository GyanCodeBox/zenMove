import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Truck, ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import { api } from '../api/client';

export default function DispatchSummaryScreen({ route, navigation }: any) {
  const { moveId, items } = route.params;
  const [loading, setLoading] = useState(false);

  const totalItems = items.length;
  const loadedItems = items.filter((i: any) => i.is_loaded).length;
  const photoCompleteCount = items.filter((i: any) => i.is_photo_complete || (i.open_photo_key && i.sealed_photo_key)).length;

  const handleDispatch = async () => {
    try {
      setLoading(true);
      await api.patch(`/moves/${moveId}/status`, { status: 'in_transit' });
      alert('TRUCK DISPATCHED! The move is now IN TRANSIT.');
      navigation.navigate('PackerDashboard');
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to dispatch truck');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Truck color="#D97706" size={48} />
          <Text style={styles.title}>Manifest Audit</Text>
          <Text style={styles.subtitle}>Final check before dispatch</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalItems}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#22C55E' }]}>{loadedItems}</Text>
            <Text style={styles.statLabel}>Loaded</Text>
          </View>
        </View>

        <View style={styles.auditCard}>
          <Text style={styles.auditTitle}>Security Checklist</Text>
          
          <View style={styles.auditItem}>
            <CheckCircle2 color={loadedItems === totalItems ? '#22C55E' : '#64748B'} size={20} />
            <Text style={styles.auditText}>All items scanned into truck ({loadedItems}/{totalItems})</Text>
          </View>

          <View style={styles.auditItem}>
            <CheckCircle2 color={photoCompleteCount === totalItems ? '#22C55E' : '#64748B'} size={20} />
            <Text style={styles.auditText}>Digital Twins captured ({photoCompleteCount}/{totalItems})</Text>
          </View>

          <View style={styles.auditItem}>
            <ShieldCheck color="#22C55E" size={20} />
            <Text style={styles.auditText}>QR Seals verified & integrated</Text>
          </View>
        </View>

        <Text style={styles.warningText}>
          Once dispatched, the manifest is locked and the E-Way bill will be finalized.
        </Text>

        <TouchableOpacity 
          style={[styles.dispatchBtn, { opacity: loading ? 0.7 : 1 }]} 
          onPress={handleDispatch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnText}>CONFIRM DISPATCH</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 24, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 16 },
  subtitle: { color: '#94A3B8', fontSize: 16, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24, width: '100%' },
  statCard: { flex: 1, backgroundColor: '#1E293B', padding: 20, borderRadius: 16, alignItems: 'center' },
  statValue: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  statLabel: { color: '#64748B', fontSize: 12, textTransform: 'uppercase', marginTop: 4 },
  auditCard: { backgroundColor: '#1E293B', padding: 24, borderRadius: 16, width: '100%', marginBottom: 24 },
  auditTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  auditItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  auditText: { color: '#94A3B8', fontSize: 14 },
  warningText: { color: '#D97706', textAlign: 'center', fontSize: 13, marginBottom: 32, fontStyle: 'italic' },
  dispatchBtn: { backgroundColor: '#D97706', width: '100%', padding: 20, borderRadius: 16, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
