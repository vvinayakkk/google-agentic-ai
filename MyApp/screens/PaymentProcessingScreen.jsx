import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';

const PaymentProcessingScreen = ({ navigation, route }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('PaymentSuccessScreen', route.params);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.text}>Paying…</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 20, marginTop: 24 },
});

export default PaymentProcessingScreen; 