import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const GoMeetingApp());
}

class GoMeetingApp extends StatelessWidget {
  const GoMeetingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '中興夠咪亭',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
      ),
      home: const HomeScreen(),
    );
  }
}
