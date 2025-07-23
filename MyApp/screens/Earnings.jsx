import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'http://192.168.0.111:8000';
const FARMER_ID = 'f001'; // Replace with dynamic value if needed

export default function Earnings({ navigation }) {
  // Hardcoded khaata book style data
  const earnings = [
    {
      id: '1',
      equipmentName: 'John Deere Tractor',
      date: '2024-07-01',
      amount: 2500,
      type: 'credit',
      icon: 'tractor',
      note: 'Rental received',
    },
    {
      id: '2',
      equipmentName: 'Rotavator',
      date: '2024-07-10',
      amount: 900,
      type: 'credit',
      icon: 'leaf',
      note: 'Rental received',
    },
    {
      id: '3',
      equipmentName: 'Power Tiller',
      date: '2024-07-15',
      amount: 1200,
      type: 'credit',
      icon: 'construct',
      note: 'Rental received',
    },
    {
      id: '4',
      equipmentName: 'Refund - Rotavator',
      date: '2024-07-18',
      amount: -300,
      type: 'debit',
      icon: 'arrow-undo',
      note: 'Refund to customer',
    },
    {
      id: '5',
      equipmentName: 'Service Charge',
      date: '2024-07-20',
      amount: -100,
      type: 'debit',
      icon: 'remove-circle',
      note: 'Platform fee',
    },
  ];
  const loading = false;
  const error = '';

  // Calculate running balance and summary
  let runningBalance = 0;
  let totalCredit = 0;
  let totalDebit = 0;
  const earningsWithBalance = earnings.map(e => {
    if (e.amount > 0) totalCredit += e.amount;
    if (e.amount < 0) totalDebit += Math.abs(e.amount);
    runningBalance += e.amount;
    return { ...e, balance: runningBalance };
  });

  const renderItem = ({ item }) => (
    <View style={[styles.card, item.type === 'debit' && styles.debitCard]}> 
      <View style={styles.iconCircle}>
        <Ionicons name={item.icon || (item.type === 'credit' ? 'wallet-outline' : 'remove-circle')} size={28} color={item.type === 'credit' ? '#4CAF50' : '#ff4444'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.equipmentName}</Text>
        <Text style={styles.subtitle}>{item.date} {item.note ? `• ${item.note}` : ''}</Text>
        <Text style={styles.balance}>Balance: <Text style={{ color: '#ffaa00' }}>₹{item.balance}</Text></Text>
      </View>
      <Text style={[styles.amount, item.type === 'credit' ? styles.creditAmount : styles.debitAmount]}>{item.amount > 0 ? `+₹${item.amount}` : `-₹${Math.abs(item.amount)}`}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.header}>Khaata Book</Text>
      </View>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Credit</Text>
          <Text style={styles.summaryCredit}>+₹{totalCredit}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Debit</Text>
          <Text style={styles.summaryDebit}>-₹{totalDebit}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Balance</Text>
          <Text style={styles.summaryBalance}>₹{runningBalance}</Text>
        </View>
      </View>
      <FlatList
        data={earningsWithBalance}
        renderItem={renderItem}
        keyExtractor={(item, idx) => item.id ? String(item.id) : String(idx)}
        contentContainerStyle={{ padding: 20, paddingTop: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No khaata entries found.</Text>}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 48 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8, marginTop: 8 },
  backButton: { padding: 8, borderRadius: 16, backgroundColor: '#181818', marginRight: 8 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', letterSpacing: -0.5, flex: 1 },
  summaryCard: { backgroundColor: '#181818', borderRadius: 16, marginHorizontal: 20, marginBottom: 24, padding: 20, shadowColor: '#ffaa00', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { color: '#cccccc', fontSize: 15, fontWeight: '500' },
  summaryCredit: { color: '#4CAF50', fontSize: 16, fontWeight: '700' },
  summaryDebit: { color: '#ff4444', fontSize: 16, fontWeight: '700' },
  summaryBalance: { color: '#ffaa00', fontSize: 18, fontWeight: 'bold' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#181818', borderRadius: 18, padding: 20, marginBottom: 18, shadowColor: '#ffaa00', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  debitCard: { borderLeftWidth: 4, borderLeftColor: '#ff4444' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 2 },
  subtitle: { fontSize: 14, color: '#cccccc', marginBottom: 2 },
  balance: { fontSize: 13, color: '#ffaa00', marginTop: 2 },
  amount: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  creditAmount: { color: '#4CAF50' },
  debitAmount: { color: '#ff4444' },
  error: { color: 'red', margin: 16 },
  empty: { color: '#888', textAlign: 'center', marginTop: 40 },
}); 