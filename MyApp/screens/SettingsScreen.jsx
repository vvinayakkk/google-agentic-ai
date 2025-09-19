import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Row = ({ label, control }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View>{control}</View>
  </View>
);

export default function SettingsScreen({ navigation }) {
  const { theme, mode, setMode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <StatusBar barStyle={theme.colors.statusBarStyle} />
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground, borderBottomColor: theme.colors.border }]}> 
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.colors.headerTitle }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.headerTitle }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>

        <Row 
          label="Use System Theme" 
          control={
            <Switch
              value={mode === 'system'}
              onValueChange={(v) => setMode(v ? 'system' : 'light')}
              trackColor={{ false: '#bbb', true: theme.colors.primary }}
              thumbColor={'#fff'}
            />
          }
        />

        <Row 
          label="Dark Mode" 
          control={
            <Switch
              value={mode === 'dark'}
              onValueChange={(v) => setMode(v ? 'dark' : 'light')}
              disabled={mode === 'system'}
              trackColor={{ false: '#bbb', true: theme.colors.primary }}
              thumbColor={'#fff'}
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backBtn: { padding: 8, width: 40 },
  backText: { fontSize: 18, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLabel: { fontSize: 16 },
});
