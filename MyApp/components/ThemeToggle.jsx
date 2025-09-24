import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { toggleTheme, mode, theme } = useTheme();
  return (
    <TouchableOpacity onPress={toggleTheme} style={[styles.button, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}> 
      <Text style={[styles.text, { color: theme.colors.text }]}>{mode === 'dark' ? '🌙' : '☀️'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 17,
    marginRight: 53,
    // backgroundColor: '#C8E6C9'
  },
  text: { fontSize: 20 },
});
