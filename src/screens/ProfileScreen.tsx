import { View, Text, StyleSheet } from 'react-native'
import React from 'react'

export default function ProfileScreen() {
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.screenText}>ProfileScreen</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#1e0025',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});