import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';

const PayAnyoneScreen = ({ navigation }) => {
  const [payAnyoneInput, setPayAnyoneInput] = useState('');
  const payAnyoneRecents = [
    { name: 'Anilkumar Saroj', phone: '+91 99308 04309', color: '#a21caf', initial: 'A' },
  ];
  const payAnyoneAll = [
    { type: 'self', name: 'Self transfer', desc: 'Transfer money between your accounts', color: '#2563eb', icon: 'person' },
    { type: 'group', name: 'New group', desc: 'Start group chat or split an expense', color: '#2563eb', icon: 'group-add' },
    { name: '5B30 viraj verma', phone: '+91 70214 51277', color: '#6366f1', initial: '5' },
    { name: 'Aadi Tendulkar', phone: '+91 99205 13049', color: '#64748b', initial: 'A', avatar: true },
  ];
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.payAnyoneHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.payAnyoneBackBtn}>
          <IonIcon name="arrow-back" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.payAnyoneTitle}>Pay anyone</Text>
      </View>
      <View style={styles.payAnyoneContent}>
        <Text style={styles.payAnyoneSubtitle}>Pay any <Text style={{fontFamily:'monospace',fontWeight:'bold'}}>UPI</Text> app using name, number or UPI ID</Text>
        <View style={styles.payAnyoneInputRow}>
          <TextInput
            style={styles.payAnyoneInput}
            placeholder="Enter UPI ID or number"
            placeholderTextColor="#aaa"
            value={payAnyoneInput}
            onChangeText={setPayAnyoneInput}
          />
          <TouchableOpacity style={styles.payAnyoneInputBtn}>
            <Text style={styles.payAnyoneInputBtnText}>123</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.payAnyoneInputUserBtn}>
            <Icon name="person" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
        <ScrollView style={{flex:1}} contentContainerStyle={styles.payAnyoneScrollContent}>
          {/* New quick actions */}
          <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:18}}>
            <TouchableOpacity style={{flex:1, backgroundColor:'#dbeafe', borderRadius:18, marginRight:8, alignItems:'center', paddingVertical:12}} onPress={() => navigation.navigate('BankTransferScreen')}>
              <Text style={{color:'#2563eb', fontWeight:'700', fontSize:16}}>Bank Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{flex:1, backgroundColor:'#dbeafe', borderRadius:18, marginLeft:8, alignItems:'center', paddingVertical:12}} onPress={() => navigation.navigate('MobileRechargeScreen')}>
              <Text style={{color:'#2563eb', fontWeight:'700', fontSize:16}}>Mobile Recharge</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.payAnyoneSectionTitle}>Recents</Text>
          {payAnyoneRecents.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.payAnyoneRecentRow}
              onPress={() => navigation.navigate('ContactUPIDetail', { contact: item })}
            >
              <View style={[styles.payAnyoneAvatar, {backgroundColor: item.color}]}> 
                <Text style={styles.payAnyoneAvatarText}>{item.initial}</Text>
              </View>
              <View>
                <Text style={styles.payAnyoneRecentName}>{item.name}</Text>
                <Text style={styles.payAnyoneRecentPhone}>{item.phone}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <Text style={styles.payAnyoneSectionTitle}>All people on UPI</Text>
          {payAnyoneAll.map((item, i) => (
            item.type === 'self' ? (
              <TouchableOpacity
                key={i}
                style={styles.payAnyoneAllRow}
                onPress={() => navigation.navigate('ContactUPIDetail', { contact: item })}
              >
                <View style={[styles.payAnyoneAvatar, {backgroundColor: item.color}]}> 
                  <Icon name="person" size={22} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.payAnyoneAllName}>{item.name}</Text>
                  <Text style={styles.payAnyoneAllDesc}>{item.desc}</Text>
                </View>
              </TouchableOpacity>
            ) : item.type === 'group' ? (
              <TouchableOpacity
                key={i}
                style={styles.payAnyoneAllRow}
                onPress={() => navigation.navigate('ContactUPIDetail', { contact: item })}
              >
                <View style={[styles.payAnyoneAvatar, {backgroundColor: item.color}]}> 
                  <Icon name="group-add" size={22} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.payAnyoneAllName}>{item.name}</Text>
                  <Text style={styles.payAnyoneAllDesc}>{item.desc}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key={i}
                style={styles.payAnyoneAllRow}
                onPress={() => navigation.navigate('ContactUPIDetail', { contact: item })}
              >
                <View style={[styles.payAnyoneAvatar, {backgroundColor: item.color}]}> 
                  <Text style={styles.payAnyoneAvatarText}>{item.initial}</Text>
                </View>
                <View>
                  <Text style={styles.payAnyoneAllName}>{item.name}</Text>
                  <Text style={styles.payAnyoneRecentPhone}>{item.phone}</Text>
                </View>
              </TouchableOpacity>
            )
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  payAnyoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#18181b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  payAnyoneContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  payAnyoneBackBtn: {
    marginRight: 16,
    padding: 8,
  },
  payAnyoneTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  payAnyoneSubtitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 18,
    marginLeft: 2,
  },
  payAnyoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#444',
    paddingHorizontal: 8,
    height: 48,
  },
  payAnyoneInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  payAnyoneInputBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 6,
  },
  payAnyoneInputBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  payAnyoneInputUserBtn: {
    backgroundColor: '#444',
    borderRadius: 16,
    padding: 6,
    marginLeft: 2,
  },
  payAnyoneScrollContent: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  payAnyoneSectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 26,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  payAnyoneRecentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 14,
  },
  payAnyoneAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  payAnyoneAvatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  payAnyoneRecentName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  payAnyoneRecentPhone: {
    color: '#aaa',
    fontSize: 13,
  },
  payAnyoneAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 14,
  },
  payAnyoneAllName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  payAnyoneAllDesc: {
    color: '#aaa',
    fontSize: 13,
  },
});

export default PayAnyoneScreen; 