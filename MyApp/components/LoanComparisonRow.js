import React from 'react';
import { View, Text } from 'react-native';

const LoanComparisonRow = ({ label, kcc, gold, cooperative, styles }) => (
  <View style={styles.loanRow}>
    <Text style={styles.loanLabel}>{label}</Text>
    <Text style={[styles.loanValue, styles.loanValueRecommended]}>{kcc}</Text>
    <Text style={styles.loanValue}>{gold}</Text>
    <Text style={[styles.loanValue, styles.loanValueRecommended]}>{cooperative}</Text>
  </View>
);

export default LoanComparisonRow; 