import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function AnimatedLoading({ visible }) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.text}>Getting your app ready...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: 'rgba(0,0,0,0.92)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 20,
  },
}); 