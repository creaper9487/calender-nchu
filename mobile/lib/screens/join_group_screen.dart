import 'package:flutter/material.dart';
import 'group_screen.dart';

class JoinGroupScreen extends StatefulWidget {
  const JoinGroupScreen({super.key});

  @override
  State<JoinGroupScreen> createState() => _JoinGroupScreenState();
}

class _JoinGroupScreenState extends State<JoinGroupScreen> {
  static final _codeRe = RegExp(r'^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$');
  final _controller = TextEditingController();
  String? _error;

  void _submit() {
    final v = _controller.text.trim().toUpperCase();
    if (!_codeRe.hasMatch(v)) {
      setState(() => _error = '6 碼大寫英數，0/O/1/I/L 不出現');
      return;
    }
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => GroupScreen(code: v)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('加入群組')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _controller,
              autofocus: true,
              textCapitalization: TextCapitalization.characters,
              maxLength: 6,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 24,
                letterSpacing: 8,
              ),
              decoration: InputDecoration(
                hintText: 'ABC123',
                border: const OutlineInputBorder(),
                errorText: _error,
              ),
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: 12),
            FilledButton(onPressed: _submit, child: const Text('進入')),
          ],
        ),
      ),
    );
  }
}
