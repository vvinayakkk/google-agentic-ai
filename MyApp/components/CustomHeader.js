import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const CustomHeader = ({ title = 'Plantix', small = false }) => (
  <View style={[styles.headerContainer, small && styles.headerContainerSmall]}>
    <Text style={[styles.headerTitle, small && styles.headerTitleSmall]}>{title}</Text>
    <TouchableOpacity style={styles.menuButton}>
      <Text style={[styles.menuIcon, small && styles.menuIconSmall]}>⋮</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 6,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  headerContainerSmall: {
    paddingTop: 32,
    paddingBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
  },
  headerTitleSmall: {
    fontSize: 18,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 28,
    color: '#555',
    fontWeight: 'bold',
  },
  menuIconSmall: {
    fontSize: 20,
  },
});

export default CustomHeader; 