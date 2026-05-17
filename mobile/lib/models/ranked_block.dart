class RankedBlock {
  RankedBlock({
    required this.dayOfWeek,
    required this.fromPeriod,
    required this.toPeriod,
    required this.length,
    required this.fromTime,
    required this.toTime,
    required this.score,
    required this.isWeekday,
  });

  final int dayOfWeek;
  final int fromPeriod;
  final int toPeriod;
  final int length;
  final String fromTime;
  final String toTime;
  final int score;
  final bool isWeekday;

  factory RankedBlock.fromJson(Map<String, dynamic> json) {
    return RankedBlock(
      dayOfWeek: json['dayOfWeek'] as int,
      fromPeriod: json['fromPeriod'] as int,
      toPeriod: json['toPeriod'] as int,
      length: json['length'] as int,
      fromTime: json['fromTime'] as String,
      toTime: json['toTime'] as String,
      score: json['score'] as int,
      isWeekday: json['isWeekday'] as bool,
    );
  }
}

const List<String> kDayNamesZh = [
  '週一',
  '週二',
  '週三',
  '週四',
  '週五',
  '週六',
  '週日',
];
