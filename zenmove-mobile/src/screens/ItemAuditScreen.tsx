import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { AlertCircle, CheckCircle, Package } from 'lucide-react-native';
import { api } from '../api/client';

export default function ItemAuditScreen({ route, navigation }: any) {
  const { item } = route.params;
  const [loading, setLoading] = useState(false);

  // Derive condition mismatch
  const hasMismatch = item.condition_post !== null && item.condition_post !== item.condition_pre;
  const isOk = item.condition_post === item.condition_pre;

  const handleRaiseDispute = async () => {
    try {
        await api.post(`/moves/${item.move_id}/disputes`, {
            item_id: item.id,
            dispute_type: 'damage',
            description: 'Customer detected variance between origin conditions and delivered conditions during digital twin audit.'
        });
        alert('Dispute raised! The 48-hour M4 Escrow release has been put on hold. A ZenMove agent will contact you shortly.');
        navigation.goBack();
    } catch (e: any) {
        alert(e.response?.data?.detail || 'Failed to raise dispute');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Digital Twin Audit</Text>
        <Text style={styles.subtitle}>ID: {item.qr_code}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Package color="white" size={24} />
            <Text style={styles.itemName}>{item.name}</Text>
          </View>

          {/* Condition Comparison */}
          <View style={styles.conditionRow}>
            <View style={styles.conditionBox}>
              <Text style={styles.label}>Origin Condition</Text>
              <Text style={styles.conditionText}>{item.condition_pre?.toUpperCase() || 'UNKNOWN'}</Text>
            </View>
            <View style={styles.conditionBox}>
              <Text style={styles.label}>Delivered Condition</Text>
              <Text style={[styles.conditionText, hasMismatch ? { color: '#EF4444' } : { color: '#22C55E' }]}>
                {item.condition_post?.toUpperCase() || 'PENDING SCAN'}
              </Text>
            </View>
          </View>
          
          {hasMismatch ? (
            <View style={styles.warningBox}>
              <AlertCircle color="#EF4444" size={20} />
              <Text style={styles.warningText}>Condition mismatch detected during destination audit!</Text>
            </View>
          ) : isOk ? (
            <View style={[styles.warningBox, { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22C55E' }]}>
              <CheckCircle color="#22C55E" size={20} />
              <Text style={[styles.warningText, { color: '#22C55E' }]}>0% Variance. Item condition matches origin.</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Digital Twin Photos</Text>

        {/* Photos Grid */}
        <View style={styles.photoContainer}>
          <View style={styles.photoBox}>
            <Text style={styles.photoLabel}>Origin Open Box</Text>
            {item.photo_url_open ? (
              <Image source={{ uri: item.photo_url_open }} style={styles.photo} />
            ) : (
              <View style={styles.noPhoto}><Text style={{ color: '#64748B' }}>No Photo</Text></View>
            )}
          </View>

          <View style={styles.photoBox}>
            <Text style={styles.photoLabel}>Origin Sealed</Text>
            {item.photo_url_sealed ? (
              <Image source={{ uri: item.photo_url_sealed }} style={styles.photo} />
            ) : (
              <View style={styles.noPhoto}><Text style={{ color: '#64748B' }}>No Photo</Text></View>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.disputeBtn}
          onPress={handleRaiseDispute}
        >
          <AlertCircle color="white" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.btnText}>Raise Dispute</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 24, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  content: { padding: 20 },
  card: { backgroundColor: '#1E293B', padding: 20, borderRadius: 16, marginBottom: 24 },
  itemName: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 12 },
  conditionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  conditionBox: { flex: 1, backgroundColor: '#0F172A', padding: 12, borderRadius: 8 },
  label: { color: '#94A3B8', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  conditionText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  warningBox: { flexDirection: 'row', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: '#EF4444', padding: 12, borderRadius: 8, alignItems: 'center' },
  warningText: { color: '#EF4444', fontSize: 14, fontWeight: 'bold', marginLeft: 8, flex: 1 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  photoContainer: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  photoBox: { flex: 1 },
  photoLabel: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#1E293B' },
  noPhoto: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  disputeBtn: { backgroundColor: '#EF4444', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
