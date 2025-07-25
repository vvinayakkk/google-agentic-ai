import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DetailCard = ({ title, children, color = '#58D68D' }) => (
  <View style={styles.detailCard}>
    <View style={styles.detailHeader}>
      <View style={[styles.detailIndicator, { backgroundColor: color }]} />
      <Text style={styles.detailTitle}>{title}</Text>
    </View>
    <View style={styles.detailContent}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  detailCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  detailContent: {
    paddingLeft: 14,
  },
});

export default DetailCard; 