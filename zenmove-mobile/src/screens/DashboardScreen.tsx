import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Truck, Package, LogOut, Bell } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { Move } from '../types';

export default function DashboardScreen({ navigation, route }: any) {
  const { setAuthState } = route.params;
  const [moves, setMoves] = useState<Move[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifs, setShowNotifs] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mRes, nRes] = await Promise.all([
        api.get('/moves'),
        api.get('/notifications')
      ]);
      setMoves(mRes.data.data);
      setNotifs(nRes.data.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const renderMove = ({ item }: { item: Move }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.routeText}>{item.origin_city_code} → {item.dest_city_code}</Text>
        <Text style={styles.statusBadge}>{item.status}</Text>
      </View>
      <Text style={styles.dateText}>{new Date(item.scheduled_at).toDateString()}</Text>
      
      {item.eway_bill_no && (
        <View style={styles.ewayBadge}>
          <Text style={styles.ewayText}>E-Way: {item.eway_bill_no}</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => navigation.navigate('PackerMoveDetail', { moveId: item.id })}
        >
          <Package color="white" size={16} />
          <Text style={styles.btnText}>Manage Items</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: item.status === 'in_transit' ? '#22C55E' : '#3B82F6' }]}
          onPress={() => {
            if (item.status === 'in_transit') {
              navigation.navigate('PackerMoveDetail', { moveId: item.id });
            } else {
              navigation.navigate('Scanner', { mode: 'load', moveId: item.id });
            }
          }}
        >
          <Truck color="white" size={16} />
          <Text style={styles.btnText}>
            {item.status === 'in_transit' ? 'Unload Truck' : 'Load Truck'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your Jobs</Text>
          <Text style={styles.subtitle}>Packer/Driver Operations</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity 
            style={[styles.notifBtn, notifs.some(n => !n.is_read) && styles.notifUnread]} 
            onPress={() => setShowNotifs(true)}
          >
            <Bell color="white" size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={() => setAuthState({ authenticated: false })}
          >
            <LogOut color="white" size={20} />
          </TouchableOpacity>
        </View>
      </View>
      
      <Modal visible={showNotifs} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recent Updates</Text>
              <TouchableOpacity onPress={() => setShowNotifs(false)}>
                <Text style={{ color: '#3B82F6', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList 
              data={notifs}
              keyExtractor={n => n.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}
                  onPress={() => {
                    setShowNotifs(false);
                    if (item.move_id) navigation.navigate('PackerMoveDetail', { moveId: item.move_id });
                  }}
                >
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifMsg}>{item.message}</Text>
                  <Text style={styles.notifDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {loading ? (
        <ActivityIndicator size="large" color="#D97706" style={{ marginTop: 40 }} />
      ) : (
        <FlatList 
          data={moves}
          keyExtractor={m => m.id}
          renderItem={renderMove}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <Text style={{color: '#94A3B8', textAlign: 'center'}}>No jobs assigned yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { 
    padding: 24, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  logoutBtn: { backgroundColor: '#334155', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  notifBtn: { backgroundColor: '#334155', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  notifUnread: { borderColor: '#EAB308', borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0F172A', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '70%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  notifItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  notifItemUnread: { backgroundColor: 'rgba(234, 179, 8, 0.05)' },
  notifTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  notifMsg: { color: '#94A3B8', marginTop: 4 },
  notifDate: { color: '#64748B', fontSize: 11, marginTop: 8 },
  card: { backgroundColor: '#1E293B', padding: 20, borderRadius: 12, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  routeText: { color: 'white', fontSize: 18, fontWeight: '600' },
  statusBadge: { color: '#D97706', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  dateText: { color: '#94A3B8', fontSize: 14, marginBottom: 12 },
  ewayBadge: { backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#22C55E' },
  ewayText: { color: '#22C55E', fontSize: 13, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: '#D97706', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
