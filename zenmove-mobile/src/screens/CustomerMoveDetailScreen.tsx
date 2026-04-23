import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '../api/client';
import { Move, EscrowStatus } from '../types';
import { ShieldCheck } from 'lucide-react-native';

export default function CustomerMoveDetailScreen({ route, navigation }: any) {
  const { moveId } = route.params;
  const [move, setMove] = useState<Move | null>(null);
  const [escrow, setEscrow] = useState<EscrowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchMoveDetails();
  }, [moveId]);

  const fetchMoveDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/moves/${moveId}`);
      setMove(res.data.data);
      
      // Try to definitively fetch Escrow if the move is booked or beyond
      if (res.data.data.status !== 'quoted') {
        try {
          const escrowRes = await api.get(`/moves/${moveId}/escrow/status`);
          setEscrow(escrowRes.data.data);
        } catch (e) {
          // Escrow not initialized yet (404)
        }
      }
    } catch (err) {
      console.error('Failed to fetch details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitEscrow = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/moves/${moveId}/escrow/init`, { payment_method: "upi", amount: move?.quote_amount });
      alert('Secured move via Zero-Trust Escrow!');
      // Dynamically bind the backend response immediately!
      setEscrow(res.data.data);
      fetchMoveDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to initialize escrow');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBookMove = async () => {
    try {
      setActionLoading(true);
      await api.patch(`/moves/${moveId}/status`, { status: 'booked' });
      alert('Quote Accepted! Move is now officially BOOKED.');
      fetchMoveDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to book move');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartLoading = async () => {
    try {
      setActionLoading(true);
      await api.patch(`/moves/${moveId}/status`, { status: 'loading' });
      alert('Move status updated to LOADING. Packer operations are now active!');
      fetchMoveDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start loading');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !move) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#D97706" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Move Details</Text>
          <Text style={styles.badge}>{move.status}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Route</Text>
          <Text style={styles.value}>{move.origin_city_code} → {move.dest_city_code}</Text>
          
          <Text style={[styles.label, {marginTop: 12}]}>Quote Amount</Text>
          <Text style={styles.value}>₹{move.quote_amount}</Text>

          {move.eway_bill_no && (
            <>
              <Text style={[styles.label, {marginTop: 12}]}>E-Way Bill</Text>
              <Text style={styles.value}>{move.eway_bill_no}</Text>
            </>
          )}

          {move.status === 'quoted' && (
            <TouchableOpacity 
              style={[styles.payBtn, {backgroundColor: '#3B82F6', marginTop: 24}]} 
              onPress={handleBookMove}
              disabled={actionLoading}
            >
              <Text style={styles.btnText}>{actionLoading ? "Processing..." : "Accept Quote & Book Move"}</Text>
            </TouchableOpacity>
          )}

          {move.status === 'booked' && (
            <TouchableOpacity 
              style={[styles.payBtn, {backgroundColor: '#22C55E', marginTop: 24}]} 
              onPress={handleStartLoading}
              disabled={actionLoading}
            >
              <Text style={styles.btnText}>{actionLoading ? "Processing..." : "Packer Arrived: Start Job"}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Financial Trust</Text>
        
        {escrow ? (
          <View style={[styles.card, { borderColor: '#D97706', borderWidth: 1 }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
              <ShieldCheck color="#D97706" />
              <Text style={{color: '#D97706', fontSize: 18, fontWeight: 'bold', marginLeft: 8}}>Vault Secured</Text>
            </View>
            <Text style={styles.label}>Vault Balance</Text>
            <Text style={styles.value}>₹{escrow.vault_balance}</Text>
            <Text style={[styles.label, {marginTop: 8}]}>Released to Packer</Text>
            <Text style={styles.value}>₹{escrow.released_amount}</Text>

            <TouchableOpacity style={styles.payBtn} onPress={() => alert('OTP / Release milestone functionality coming next!')}>
              <Text style={styles.btnText}>Release M3 (Delivery OTP)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={{color: 'white', marginBottom: 16}}>This move is completely unprotected. Secure your payment instantly with ZenMove Escrow.</Text>
            <TouchableOpacity 
              style={styles.payBtn} 
              onPress={handleInitEscrow}
              disabled={actionLoading}
            >
              <Text style={styles.btnText}>{actionLoading ? "Securing Vault..." : "Pay ₹" + (move.quote_amount + (move.quote_amount*0.02)) + " to Escrow"}</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingVertical: 10 },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  badge: { backgroundColor: '#334155', color: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, overflow: 'hidden', fontWeight: 'bold', textTransform: 'uppercase' },
  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 24, marginBottom: 16 },
  card: { backgroundColor: '#1E293B', padding: 20, borderRadius: 16 },
  label: { color: '#94A3B8', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  value: { color: 'white', fontSize: 18, fontWeight: '600' },
  payBtn: { backgroundColor: '#D97706', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
