import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/api_client.dart';
import '../models/group_state.dart';
import '../models/ranked_block.dart';
import '../storage/local_store.dart';

class GroupScreen extends StatefulWidget {
  const GroupScreen({super.key, required this.code});
  final String code;

  @override
  State<GroupScreen> createState() => _GroupScreenState();
}

class _GroupScreenState extends State<GroupScreen> {
  static const _pollInterval = Duration(seconds: 5);

  final _api = ApiClient();
  final _store = LocalStore();
  Timer? _timer;
  GroupState? _state;
  String? _studentId;
  String? _error;
  bool _joinAttempted = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    _studentId = await _store.readStudentId();
    await _refresh();
    _timer = Timer.periodic(_pollInterval, (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final s = await _api.getGroup(widget.code);
      if (!mounted) return;
      setState(() {
        _state = s;
        _error = null;
      });
      _maybeJoin();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _maybeJoin() async {
    final id = _studentId;
    final s = _state;
    if (id == null || s == null || _joinAttempted) return;
    if (s.members.contains(id)) return;
    _joinAttempted = true;
    try {
      await _api.joinGroup(widget.code, id);
      await _refresh();
    } catch (_) {
      _joinAttempted = false;
    }
  }

  Future<void> _share() async {
    final url = '${_api.baseUrl}/group/${widget.code}';
    await Clipboard.setData(ClipboardData(text: url));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('已複製連結 $url')),
    );
  }

  Future<void> _importInBrowser() async {
    final uri = Uri.parse('${_api.baseUrl}/startup?group=${widget.code}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('群組 ${widget.code}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            tooltip: '分享連結',
            onPressed: _share,
          ),
        ],
      ),
      body: _state == null && _error == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(_error!,
                          style: TextStyle(color: Colors.red.shade800)),
                    ),
                  if (_studentId == null)
                    _NeedScheduleBanner(
                      message: '還沒設定學號 / 匯入課表',
                      onAction: _importInBrowser,
                    )
                  else if (_state != null &&
                      _state!.missing.contains(_studentId))
                    _NeedScheduleBanner(
                      message: '你的學號 $_studentId 還沒匯入課表',
                      onAction: _importInBrowser,
                    ),
                  if (_state != null) ...[
                    const SizedBox(height: 12),
                    _Members(state: _state!, myId: _studentId),
                    const SizedBox(height: 12),
                    _Blocks(state: _state!),
                  ],
                ],
              ),
            ),
    );
  }
}

class _NeedScheduleBanner extends StatelessWidget {
  const _NeedScheduleBanner({required this.message, required this.onAction});
  final String message;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Expanded(child: Text(message)),
            TextButton(
              onPressed: onAction,
              child: const Text('匯入'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Members extends StatelessWidget {
  const _Members({required this.state, required this.myId});
  final GroupState state;
  final String? myId;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('成員 (${state.members.length})',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (state.members.isEmpty)
              const Text('還沒有人加入')
            else
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final m in state.members)
                    Chip(
                      label: Text(
                        m + (m == myId ? ' (你)' : ''),
                        style: const TextStyle(fontFamily: 'monospace'),
                      ),
                      backgroundColor: state.missing.contains(m)
                          ? Colors.amber.shade100
                          : null,
                    ),
                ],
              ),
            if (state.missing.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '⚠ 標黃的成員還沒匯入課表',
                  style: TextStyle(
                      fontSize: 12, color: Colors.amber.shade800),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Blocks extends StatelessWidget {
  const _Blocks({required this.state});
  final GroupState state;

  @override
  Widget build(BuildContext context) {
    if (state.found.length < 2) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Center(
            child: Text(
              '等更多人匯入課表（目前 ${state.found.length} 人，至少需要 2 人）',
              style: TextStyle(color: Colors.grey.shade700),
            ),
          ),
        ),
      );
    }
    if (state.blocks.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: Text('這群人沒有共同空堂 😢')),
        ),
      );
    }
    return Card(
      child: Column(
        children: [
          for (final b in state.blocks)
            ListTile(
              dense: true,
              leading: SizedBox(
                width: 48,
                child: Text(
                  kDayNamesZh[b.dayOfWeek],
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: b.isWeekday ? null : Colors.grey,
                  ),
                ),
              ),
              title: Text(
                '${b.fromTime}–${b.toTime}',
                style: const TextStyle(fontFamily: 'monospace'),
              ),
              subtitle: Text(
                '第 ${b.fromPeriod + 1}'
                '${b.length > 1 ? "–${b.toPeriod + 1}" : ""} 節',
              ),
              trailing: Text('${b.length} 節'),
            ),
        ],
      ),
    );
  }
}
