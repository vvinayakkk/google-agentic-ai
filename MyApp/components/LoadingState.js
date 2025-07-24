import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';

const ProgressBar = ({ progress, color = '#58D68D' }) => (
  <View style={styles.progressBarContainer}>
    <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
  </View>
);

const LoadingState = ({ text, progress = 0 }) => (
  <View style={styles.centerContainer}>
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#58D68D" />
      <Text style={styles.loadingText}>{text}</Text>
      {progress > 0 && <ProgressBar progress={progress} />}
    </View>
  </View>
);

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 16,
    color: '#A9A9A9',
    marginTop: 15,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: 200,
    height: 4,
    backgroundColor: '#2C2C2C',
    borderRadius: 2,
    marginTop: 15,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default LoadingState; 