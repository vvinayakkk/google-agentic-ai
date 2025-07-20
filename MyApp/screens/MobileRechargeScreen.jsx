import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const operators = [
  { label: 'Jio', value: 'jio' },
  { label: 'Airtel', value: 'airtel' },
  { label: 'Vi', value: 'vi' },
  { label: 'BSNL', value: 'bsnl' },
];

const MobileRechargeScreen = ({ navigation, route }) => {
  const contact = route?.params?.contact;
  const [mobile, setMobile] = useState(contact?.phone || '');
  const [operator, setOperator] = useState(operators[0].value);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Icon name="arrow-back" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mobile Recharge</Text>
      </View>
      {contact && (
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder="Mobile Number"
        placeholderTextColor="#aaa"
        value={mobile}
        onChangeText={setMobile}
        keyboardType="numeric"
        maxLength={10}
      />
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={operator}
          style={styles.picker}
          onValueChange={setOperator}
        >
          {operators.map(op => (
            <Picker.Item key={op.value} label={op.label} value={op.value} />
          ))}
        </Picker>
      </View>
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
        onPress={() => navigation.navigate('MobileRechargeProcessingScreen', { mobile, operator, amount, note })}
        disabled={!mobile || !operator || !amount}
      >
        <Text style={styles.proceedBtnText}>Proceed</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: StatusBar.currentHeight,
  },
  headerIconBtn: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  contactInfo: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  contactName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactPhone: {
    color: '#aaa',
    fontSize: 16,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 24, alignSelf: 'center' },
  input: { backgroundColor: '#18181b', color: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 },
  pickerWrapper: { backgroundColor: '#18181b', borderRadius: 12, marginBottom: 16 },
  picker: { color: '#fff', height: 50 },
  proceedBtn: { backgroundColor: '#2563eb', borderRadius: 22, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  proceedBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

export default MobileRechargeScreen; 