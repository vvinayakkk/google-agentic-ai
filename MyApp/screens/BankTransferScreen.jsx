import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const BankTransferScreen = ({ navigation, route }) => {
  const contact = route?.params?.contact;
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [name, setName] = useState(contact?.name || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Icon name="arrow-back" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Transfer</Text>
      </View>
      {contact && (
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder="Account Number"
        placeholderTextColor="#aaa"
        value={accountNumber}
        onChangeText={setAccountNumber}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="IFSC Code"
        placeholderTextColor="#aaa"
        value={ifsc}
        onChangeText={setIfsc}
        autoCapitalize="characters"
      />
      <TextInput
        style={styles.input}
        placeholder="Recipient Name"
        placeholderTextColor="#aaa"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Amount"
        placeholderTextColor="#aaa"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Add note (optional)"
        placeholderTextColor="#aaa"
        value={note}
        onChangeText={setNote}
      />
      <TouchableOpacity
        style={styles.proceedBtn}
        onPress={() => navigation.navigate('BankTransferProcessingScreen', { accountNumber, ifsc, name, amount, note })}
        disabled={!accountNumber || !ifsc || !name || !amount}
      >
        <Text style={styles.proceedBtnText}>Proceed</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 24, paddingTop: 65 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIconBtn: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  contactInfo: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  contactName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactPhone: {
    color: '#aaa',
    fontSize: 14,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 24, alignSelf: 'center' },
  input: { backgroundColor: '#18181b', color: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 },
  proceedBtn: { backgroundColor: '#2563eb', borderRadius: 22, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  proceedBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

export default BankTransferScreen; 