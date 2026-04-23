import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Package, ScanBarcode, Camera, Trash2 } from 'lucide-react-native';
import { api } from '../api/client';
import { Item, Move } from '../types';

export default function PackerMoveDetailScreen({ route, navigation }: any) {
  const { moveId } = route.params;
  const [move, setMove] = useState<Move | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, moveId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const moveRes = await api.get(`/moves/${moveId}`);
      setMove(moveRes.data.data);
      const itemsRes = await api.get(`/moves/${moveId}/items`);
      setItems(itemsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch move details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName) return;
    try {
      await api.post(`/moves/${moveId}/items`, { 
        name: newItemName, 
        condition_pre: 'good' 
      });
      setNewItemName('');
      fetchData();
    } catch (e: any) {
      alert('Failed to add item');
    }
  };

  const handleStartLoading = async () => {
    try {
      setLoading(true);
      await api.patch(`/moves/${moveId}/status`, { status: 'loading' });
      fetchData();
      alert('Move status updated to LOADING. You can now start scanning items!');
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to start loading');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await api.delete(`/items/${itemId}`);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to delete item');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput) return;
    try {
      setVerifyingOtp(true);
      const res = await api.post(`/moves/${moveId}/otp/verify`, { otp: otpInput });
      if (res.data.data) {
        alert('OTP VERIFIED! You can now start unloading items.');
        fetchData();
      } else {
        alert('Invalid OTP. Please ask the customer for the correct code.');
      }
    } catch (e: any) {
      alert('Verification failed');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const renderItemCard = ({ item }: { item: Item }) => (
    <View style={styles.itemCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemStatus}>
          {item.qr_code ? `🔗 Bound: ${item.qr_code}` : '⚠️ Unbound'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {/* Open Contents Photo */}
        <TouchableOpacity 
          style={[styles.photoBtn]} 
          onPress={() => navigation.navigate('PhotoCapture', { itemId: item.id, photoType: 'open' })}
        >
          <Camera color="#94A3B8" size={18} />
          <Text style={styles.photoLabel}>Open</Text>
        </TouchableOpacity>

        {/* Sealed Box Photo */}
        <TouchableOpacity 
          style={[styles.photoBtn]} 
          onPress={() => navigation.navigate('PhotoCapture', { itemId: item.id, photoType: 'sealed' })}
        >
          <Camera color="#94A3B8" size={18} />
          <Text style={styles.photoLabel}>Seal</Text>
        </TouchableOpacity>

        {!item.qr_code && (
          <TouchableOpacity 
            style={[styles.photoBtn, { borderColor: 'rgba(239, 68, 68, 0.3)' }]} 
            onPress={() => handleDeleteItem(item.id)}
          >
            <Trash2 color="#EF4444" size={18} />
            <Text style={[styles.photoLabel, { color: '#EF4444' }]}>Del</Text>
          </TouchableOpacity>
        )}

        {!item.qr_code && (
          <TouchableOpacity 
            style={styles.bindBtn} 
            onPress={() => navigation.navigate('Scanner', { mode: 'bind', itemId: item.id })}
          >
            <ScanBarcode color="white" size={16} />
            <Text style={styles.btnText}>Bind</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading && !move) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#D97706" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manifest / Items</Text>
        <Text style={styles.subtitle}>{move?.origin_city_code} → {move?.dest_city_code}</Text>
        
        {move?.status === 'booked' && (
          <TouchableOpacity style={[styles.addBtn, {marginTop: 16, backgroundColor: '#22C55E'}]} onPress={handleStartLoading}>
            <Text style={{color: 'white', fontWeight: 'bold'}}>Packer Arrival: Start Job</Text>
          </TouchableOpacity>
        )}
      </View>

      {move?.status === 'loading' && (
        <View style={styles.addItemSection}>
          <TextInput 
            style={styles.input} 
            placeholder="New Item Name (e.g. Sofa)" 
            placeholderTextColor="#64748B"
            value={newItemName}
            onChangeText={setNewItemName}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
            <Text style={{color: 'white', fontWeight: 'bold'}}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {move?.status === 'in_transit' && (
        <View style={[styles.addItemSection, { backgroundColor: '#1E293B', borderBottomColor: '#22C55E', borderBottomWidth: 2 }]}>
          <TextInput 
            style={styles.input} 
            placeholder="Enter Delivery OTP from Customer" 
            placeholderTextColor="#64748B"
            value={otpInput}
            onChangeText={setOtpInput}
            keyboardType="numeric"
            maxLength={6}
          />
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: '#22C55E' }]} 
            onPress={handleVerifyOtp}
            disabled={verifyingOtp}
          >
            <Text style={{color: 'white', fontWeight: 'bold'}}>{verifyingOtp ? '...' : 'Unlock'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList 
        data={items}
        keyExtractor={i => i.id}
        renderItem={renderItemCard}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package color="#64748B" size={48} style={{ marginBottom: 16 }} />
            <Text style={{color: '#94A3B8', textAlign: 'center'}}>No items added to manifest yet.</Text>
          </View>
        }
        ListFooterComponent={
          (move?.status === 'loading' && items.length > 0) ? (
            <TouchableOpacity 
              style={[styles.payBtn, { backgroundColor: '#D97706', marginBottom: 40 }]}
              onPress={() => navigation.navigate('DispatchSummary', { moveId, items })}
            >
              <Text style={styles.btnText}>Review & Dispatch Truck</Text>
            </TouchableOpacity>
          ) : (move?.status === 'delivered' && items.length > 0) ? (
            <View>
              <TouchableOpacity 
                style={[styles.payBtn, { backgroundColor: '#22C55E', marginBottom: 12 }]}
                onPress={() => navigation.navigate('Scanner', { mode: 'unload', moveId })}
              >
                <Text style={styles.btnText}>Scan Out / Unload Items</Text>
              </TouchableOpacity>

              {/* Only show Finalize if all items are unloaded */}
              {items.every(i => i.is_unloaded) && (
                <TouchableOpacity 
                  style={[styles.payBtn, { backgroundColor: '#D97706', marginBottom: 40 }]}
                  onPress={async () => {
                    try {
                      await api.patch(`/moves/${moveId}/status`, { status: 'completed' });
                      alert('MOVE COMPLETED! Thank you for the hard work.');
                      navigation.navigate('PackerDashboard');
                    } catch (e: any) {
                      alert('Failed to complete move');
                    }
                  }}
                >
                  <Text style={styles.btnText}>Finalize & Close Move</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 30, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 16, marginTop: 4 },
  addItemSection: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  input: { flex: 1, backgroundColor: '#1E293B', color: 'white', padding: 16, borderRadius: 8, marginRight: 12 },
  addBtn: { backgroundColor: '#D97706', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 8 },
  itemCard: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  itemName: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  itemStatus: { color: '#94A3B8', fontSize: 13 },
  bindBtn: { backgroundColor: '#3B82F6', flexDirection: 'row', padding: 12, borderRadius: 8, alignItems: 'center', gap: 6 },
  photoBtn: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', padding: 8, borderRadius: 8, alignItems: 'center', minWidth: 50 },
  photoLabel: { color: '#94A3B8', fontSize: 10, marginTop: 2, fontWeight: 'bold' },
  btnText: { color: 'white', fontWeight: 'bold' },
  payBtn: { backgroundColor: '#D97706', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  emptyState: { alignItems: 'center', marginTop: 40 }
});
