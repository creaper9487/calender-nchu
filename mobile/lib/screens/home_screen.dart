import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/api_client.dart';
import '../storage/local_store.dart';
import 'group_screen.dart';
import 'join_group_screen.dart';
import 'match_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _store = LocalStore();
  final _api = ApiClient();
  String? _studentId;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final id = await _store.readStudentId();
    if (!mounted) return;
    setState(() {
      _studentId = id;
      _ready = true;
    });
  }

  Future<void> _setStudentId() async {
    final id = await _promptStudentId();
    if (id == null) return;
    await _store.writeStudentId(id);
    if (!mounted) return;
    setState(() => _studentId = id);
  }

  Future<String?> _promptStudentId() async {
    final controller = TextEditingController(text: _studentId ?? '');
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('輸入你的學號'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'e.g. s1234567'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () {
              final v = controller.text.trim();
              if (RegExp(r'^[A-Za-z0-9]{4,12}$').hasMatch(v)) {
                Navigator.pop(ctx, v);
              }
            },
            child: const Text('儲存'),
          ),
        ],
      ),
    );
  }

  Future<void> _createGroup() async {
    try {
      final code = await _api.createGroup(studentId: _studentId);
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => GroupScreen(code: code)),
      );
    } catch (e) {
      _showError(e.toString());
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _openImport() async {
    final url = '${_api.baseUrl}/startup';
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      _showError('無法開啟瀏覽器');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('中興夠咪亭')),
      body: !_ready
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    child: ListTile(
                      title: const Text('我的學號'),
                      subtitle: Text(_studentId ?? '尚未設定'),
                      trailing: TextButton(
                        onPressed: _setStudentId,
                        child: Text(_studentId == null ? '設定' : '更換'),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            MatchScreen(seed: _studentId == null ? const [] : [_studentId!]),
                      ),
                    ),
                    icon: const Icon(Icons.calendar_today),
                    label: const Text('找共同空堂'),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.tonalIcon(
                    onPressed: _createGroup,
                    icon: const Icon(Icons.group_add),
                    label: const Text('建立群組'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const JoinGroupScreen()),
                    ),
                    icon: const Icon(Icons.qr_code),
                    label: const Text('加入群組（輸入代碼）'),
                  ),
                  const SizedBox(height: 24),
                  const Divider(),
                  TextButton.icon(
                    onPressed: _openImport,
                    icon: const Icon(Icons.open_in_browser),
                    label: const Text('匯入課表（需用桌機瀏覽器）'),
                  ),
                ],
              ),
            ),
    );
  }
}
