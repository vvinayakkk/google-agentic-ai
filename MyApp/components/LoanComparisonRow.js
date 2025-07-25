import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const LoanComparisonRow = ({ label, kcc, gold, cooperative }) => (
  <View style={styles.loanRow}>
    <Text style={styles.loanLabel}>{label}</Text>
    <Text style={[styles.loanValue, styles.loanValueRecommended]}>{kcc}</Text>
    <Text style={styles.loanValue}>{gold}</Text>
    <Text style={[styles.loanValue, styles.loanValueRecommended]}>{cooperative}</Text>
  </View>
);

const styles = StyleSheet.create({
  loanRow: { 
    flexDirection: 'row', 
    paddingVertical: 8 
  },
  loanLabel: { 
    flex: 1, 
    fontSize: 14, 
    color: '#E0E0E0' 
  },
  loanValue: { 
    flex: 1, 
    fontSize: 14, 
    color: '#A9A9A9', 
    textAlign: 'center' 
  },
  loanValueRecommended: { 
    color: '#58D68D', 
    fontWeight: '600' 
  },
});

export default LoanComparisonRow; 