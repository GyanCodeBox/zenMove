import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Package, Plus, LogOut } from 'lucide-react-native';
import { api } from '../api/client';
import { Move } from '../types';

export default function CustomerDashboardScreen({ navigation, route }: any) {
  const { setAuthState } = route.params;
  const [moves, setMoves] = useState<Move[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We add a listener so it refetches when we navigate back from CreateMove
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMoves();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchMoves = async () => {
    try {
      setLoading(true);
      const res = await api.get('/moves');
      setMoves(res.data.data);
    } catch (err) {
      console.error('Failed to fetch moves', err);
    } finally {
      setLoading(false);
    }
  };

  const renderMove = ({ item }: { item: Move }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.routeText}>{item.origin_city_code} → {item.dest_city_code}</Text>
        <Text style={styles.statusBadge}>{item.status}</Text>
      </View>
      <Text style={styles.dateText}>{new Date(item.scheduled_at).toDateString()}</Text>

      <TouchableOpacity 
        style={styles.actionBtn}
        onPress={() => navigation.navigate('MoveDetail', { moveId: item.id })}
      >
        <Text style={styles.btnText}>View Status & Escrow</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Relocations</Text>
          <Text style={styles.subtitle}>Customer Dashboard</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TouchableOpacity 
            style={[styles.fab, { backgroundColor: '#334155' }]} 
            onPress={() => setAuthState({ authenticated: false })}
          >
            <LogOut color="white" size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => navigation.navigate('CreateMove')}
          >
            <Plus color="white" size={24} />
          </TouchableOpacity>
        </View>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#D97706" style={{ marginTop: 40 }} />
      ) : (
        <FlatList 
          data={moves}
          keyExtractor={m => m.id}
          renderItem={renderMove}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Package color="#64748B" size={48} style={{ marginBottom: 16 }} />
              <Text style={{color: '#94A3B8', textAlign: 'center', fontSize: 16}}>You haven't requested any moves yet.</Text>
            </View>
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
  fab: { backgroundColor: '#D97706', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#1E293B', padding: 20, borderRadius: 12, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  routeText: { color: 'white', fontSize: 18, fontWeight: '600' },
  statusBadge: { color: '#D97706', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  dateText: { color: '#94A3B8', fontSize: 14, marginBottom: 16 },
  actionBtn: { backgroundColor: '#334155', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  emptyState: { alignItems: 'center', marginTop: 100 }
});
