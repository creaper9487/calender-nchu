import 'ranked_block.dart';

class MatchResult {
  MatchResult({
    required this.requested,
    required this.found,
    required this.missing,
    required this.blocks,
  });

  final List<String> requested;
  final List<String> found;
  final List<String> missing;
  final List<RankedBlock> blocks;

  factory MatchResult.fromJson(Map<String, dynamic> json) {
    return MatchResult(
      requested: List<String>.from(json['requested'] as List? ?? const []),
      found: List<String>.from(json['found'] as List? ?? const []),
      missing: List<String>.from(json['missing'] as List? ?? const []),
      blocks: ((json['blocks'] as List?) ?? const [])
          .map((e) => RankedBlock.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
