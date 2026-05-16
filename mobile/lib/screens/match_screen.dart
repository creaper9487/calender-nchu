import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../models/match_result.dart';
import '../models/ranked_block.dart';

class MatchScreen extends StatefulWidget {
  const MatchScreen({super.key, this.seed = const []});

  final List<String> seed;

  @override
  State<MatchScreen> createState() => _MatchScreenState();
}

class _MatchScreenState extends State<MatchScreen> {
  static final _idRe = RegExp(r'^[A-Za-z0-9]{4,12}$');
  static const _maxIds = 20;

  final _api = ApiClient();
  final _controller = TextEditingController();
  final List<String> _ids = [];
  bool _loading = false;
  String? _error;
  MatchResult? _result;

  @override
  void initState() {
    super.initState();
    for (final s in widget.seed) {
      if (_idRe.hasMatch(s) && !_ids.contains(s)) _ids.add(s);
    }
  }

  void _addDraft() {
    final v = _controller.text.trim();
    _controller.clear();
    if (!_idRe.hasMatch(v) || _ids.contains(v) || _ids.length >= _maxIds) return;
    setState(() => _ids.add(v));
  }

  Future<void> _submit() async {
    if (_ids.length < 2) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await _api.match(_ids);
      if (!mounted) return;
      setState(() => _result = r);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('找共同空堂')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final id in _ids)
                  InputChip(
                    label: Text(id, style: const TextStyle(fontFamily: 'monospace')),
                    onDeleted: () => setState(() => _ids.remove(id)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _controller,
              decoration: InputDecoration(
                hintText: '學號 (e.g. s1234567)',
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.add),
                  onPressed: _addDraft,
                ),
              ),
              onSubmitted: (_) => _addDraft(),
            ),
            const SizedBox(height: 12),
            Text(
              '${_ids.length}/$_maxIds 人${_ids.length < 2 ? "（至少 2 人）" : ""}',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _ids.length >= 2 && !_loading ? _submit : null,
              child: Text(_loading ? '查詢中...' : '找共同空堂'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Text(_error!, style: TextStyle(color: Colors.red.shade800)),
              ),
            ],
            if (_result != null) ...[
              const SizedBox(height: 24),
              _Summary(result: _result!),
              const SizedBox(height: 12),
              _BlocksList(blocks: _result!.blocks, found: _result!.found.length),
            ],
          ],
        ),
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.result});
  final MatchResult result;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('找到 ${result.found.length}/${result.requested.length} 人'),
            if (result.missing.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  '查無資料：${result.missing.join(", ")}',
                  style: TextStyle(color: Colors.amber.shade800),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _BlocksList extends StatelessWidget {
  const _BlocksList({required this.blocks, required this.found});
  final List<RankedBlock> blocks;
  final int found;

  @override
  Widget build(BuildContext context) {
    if (blocks.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Center(
            child: Text(
              found == 0 ? '沒有任何人有匯入課表' : '這群人沒有共同空堂 😢',
              style: TextStyle(color: Colors.grey.shade700),
            ),
          ),
        ),
      );
    }
    return Card(
      child: Column(
        children: [
          for (final b in blocks)
            ListTile(
              dense: true,
              leading: Container(
                width: 56,
                alignment: Alignment.center,
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
