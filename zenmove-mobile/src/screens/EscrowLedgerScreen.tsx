import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Shield, ChevronRight, CheckCircle2, Clock, Landmark } from 'lucide-react-native';
import { api } from '../api/client';
import { EscrowStatus } from '../types';

export default function EscrowLedgerScreen({ route }: any) {
  const { moveId } = route.params;
  const [escrow, setEscrow] = useState<EscrowStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEscrow();
  }, []);

  const fetchEscrow = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/moves/${moveId}/escrow/status`);
      setEscrow(res.data.data);
    } catch (err) {
      console.error('Failed to fetch escrow', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#D97706" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Landmark color="#3B82F6" size={40} />
          <Text style={styles.title}>Asset Vault</Text>
          <Text style={styles.subtitle}>Protected by ZenMove Escrow</Text>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceMain}>
            <Text style={styles.balanceLabel}>VAULT BALANCE</Text>
            <Text style={styles.balanceAmount}>₹{escrow?.vault_balance.toLocaleString()}</Text>
          </View>
          <View style={styles.balanceStats}>
            <View>
              <Text style={styles.statLabel}>Total Move</Text>
              <Text style={styles.statValue}>₹{escrow?.total_amount.toLocaleString()}</Text>
            </View>
            <View>
              <Text style={styles.statLabel}>Released</Text>
              <Text style={[styles.statValue, { color: '#22C55E' }]}>₹{escrow?.released_amount.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Milestone Breakdown</Text>
        
        {escrow?.milestones.map((m, idx) => (
          <View key={m.id} style={styles.milestoneItem}>
            <View style={styles.milestoneIcon}>
              {m.status === 'released' ? (
                <CheckCircle2 color="#22C55E" size={24} />
              ) : (
                <Clock color="#64748B" size={24} />
              )}
            </View>
            <View style={styles.milestoneData}>
              <View style={styles.milestoneRow}>
                <Text style={styles.milestoneName}>
                  {m.milestone.replace('M', 'Step ').replace('_', ': ')}
                </Text>
                <Text style={styles.milestoneAmount}>₹{m.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.milestoneRow}>
                <Text style={[styles.milestoneStatus, { color: m.status === 'released' ? '#22C55E' : '#EAB308' }]}>
                  {m.status.toUpperCase()}
                </Text>
                <Text style={styles.milestonePct}>{m.pct_of_total}% of total</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.infoBox}>
          <Shield color="#3B82F6" size={20} />
          <Text style={styles.infoText}>
            Milestones are automatically released upon status updates. Vault balance is held in a secure RBI-regulated bank account.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24 },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 12 },
  subtitle: { color: '#94A3B8', fontSize: 16 },
  balanceCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 24, marginBottom: 32, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  balanceMain: { borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 20, marginBottom: 20 },
  balanceLabel: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  balanceAmount: { color: 'white', fontSize: 42, fontWeight: 'bold', marginTop: 8 },
  balanceStats: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { color: '#64748B', fontSize: 11, fontWeight: 'bold' },
  statValue: { color: 'white', fontSize: 18, fontWeight: '600', marginTop: 4 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  milestoneItem: { flexDirection: 'row', backgroundColor: '#1E293B', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
  milestoneIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  milestoneData: { flex: 1 },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  milestoneName: { color: 'white', fontSize: 15, fontWeight: '600' },
  milestoneAmount: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  milestoneStatus: { fontSize: 11, fontWeight: 'bold' },
  milestonePct: { color: '#64748B', fontSize: 11 },
  infoBox: { flexDirection: 'row', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 16, borderRadius: 12, gap: 12, marginTop: 24 },
  infoText: { color: '#94A3B8', fontSize: 13, flex: 1, lineHeight: 18 }
});
