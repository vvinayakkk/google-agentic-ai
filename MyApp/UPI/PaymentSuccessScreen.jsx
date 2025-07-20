import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PaymentSuccessScreen = ({ navigation, route }) => {
  const { recipient, amount } = route.params || {};
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <View style={styles.checkCircle}>
          <Icon name="check" size={48} color="#fff" />
        </View>
        <Text style={styles.amount}>₹{amount || '1.00'}</Text>
        <Text style={styles.paidTo}>Paid to</Text>
        <Text style={styles.recipient}>{recipient?.name || 'vivek bhatia'}</Text>
        <Text style={styles.bankingName}>Banking name: {recipient?.bankingName || 'VIVEK PREM BHATIA'}</Text>
        <Text style={styles.date}>{dateStr}, {timeStr}</Text>
        <View style={styles.rewardBox}>
          <Text style={styles.rewardText}>You have an unopened reward!</Text>
          <Text style={styles.scratchText}>Scratch to reveal</Text>
        </View>
        <TouchableOpacity style={styles.doneBtn} onPress={() => {
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
          const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          navigation.navigate('ContactUPIDetail', {
            contact: {
              ...recipient,
              payment: {
                type: 'Payment to you',
                amount: `₹${amount || '1.00'}`,
                date: dateStr,
                time: timeStr,
                status: 'Paid',
              },
              // Ensure name, phone, bankingName, initial, color are preserved
              name: recipient?.name,
              phone: recipient?.phone,
              bankingName: recipient?.bankingName,
              initial: recipient?.initial,
              color: recipient?.color,
            },
          });
        }}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  amount: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  paidTo: { color: '#fff', fontSize: 18, marginBottom: 2 },
  recipient: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  bankingName: { color: '#d1fae5', fontSize: 14, marginBottom: 2 },
  date: { color: '#aaa', fontSize: 14, marginBottom: 16 },
  rewardBox: { backgroundColor: '#18181b', borderRadius: 16, padding: 16, marginBottom: 24, alignItems: 'center' },
  rewardText: { color: '#fff', fontSize: 16, marginBottom: 4 },
  scratchText: { color: '#60a5fa', fontSize: 15 },
  doneBtn: { backgroundColor: '#dbeafe', borderRadius: 22, paddingVertical: 12, paddingHorizontal: 32, alignItems: 'center' },
  doneBtnText: { color: '#2563eb', fontSize: 18, fontWeight: '700' },
});

export default PaymentSuccessScreen; 