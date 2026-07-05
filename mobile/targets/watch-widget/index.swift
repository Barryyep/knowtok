import WidgetKit
import SwiftUI

// Must match the watch app / phone app.
let appGroup = "group.com.ohlo.daily"
let factKey = "todayFact"

struct FactSource: Codable {
  var kind: String?
  var factId: String?
  var label: String?
  var paperId: String?
  var arxivId: String?
  var title: String?
  var url: String?
  var publishedAt: String?
}

/// djb2 dispatch № — mirrors src/components/slipUtils.ts and the phone widget.
func dispatchNumber(_ id: String) -> Int {
  var h: UInt32 = 5381
  for b in id.utf8 { h = h &* 33 &+ UInt32(b) }
  return 1000 + Int(h % 9000)
}

struct SharedFact: Codable {
  var date: String
  var emoji: String
  var topic: String
  var fact: String
  var whyCare: String
  var source: FactSource?
  var language: String?  // "zh" | "en"; optional — older payloads omit this field
}

struct FactEntry: TimelineEntry {
  let date: Date
  let fact: SharedFact?
}

func loadSharedFact() -> SharedFact? {
  guard
    let defaults = UserDefaults(suiteName: appGroup),
    let raw = defaults.string(forKey: factKey),
    let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(SharedFact.self, from: data)
}

/// Today's local date as a short label (e.g. "JUL 5"), Space Mono / postmark feel.
func todayShortLabel() -> String {
  let f = DateFormatter()
  f.locale = Locale(identifier: "en_US_POSIX")
  f.dateFormat = "MMM d"
  return f.string(from: Date()).uppercased()
}

struct FactProvider: TimelineProvider {
  func placeholder(in context: Context) -> FactEntry {
    FactEntry(
      date: Date(),
      fact: SharedFact(
        date: "2026-01-01",
        emoji: "",
        topic: "AI与机器人",
        fact: "研究者让大模型互相辩论,事实准确率提升了23%。",
        whyCare: "",
        source: nil
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (FactEntry) -> Void) {
    completion(FactEntry(date: Date(), fact: loadSharedFact() ?? placeholder(in: context).fact))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<FactEntry>) -> Void) {
    let entry = FactEntry(date: Date(), fact: loadSharedFact())
    // Re-read the shared fact every 15 min so a complication self-heals after
    // a phone push even when the watch app wasn't open to reloadAllTimelines.
    // (WidgetKit still refreshes on its own budget; this is the ceiling.)
    let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct ComplicationView: View {
  @Environment(\.widgetFamily) var family
  let entry: FactEntry

  // Language detection: explicit payload field; fall back to CJK heuristic.
  private func effectiveLanguage(_ fact: SharedFact) -> String {
    if let lang = fact.language, !lang.isEmpty { return lang }
    let isCJK = fact.fact.unicodeScalars.contains { s in
      (0x4E00...0x9FFF ~= s.value) ||
      (0x3040...0x30FF ~= s.value) ||
      (0xAC00...0xD7AF ~= s.value)
    }
    return isCJK ? "zh" : "en"
  }

  private func stampText(_ source: FactSource?) -> String? {
    guard let source else { return nil }
    if let label = source.label, !label.isEmpty { return "⌖ \(label) ✓" }
    if let arxiv = source.arxivId, !arxiv.isEmpty { return "⌖ arXiv:\(arxiv) ✓" }
    return nil
  }

  var body: some View {
    Group {
      if let fact = entry.fact {
        switch family {

        // Inline: single-line slot — dispatch № + truncated fact
        case .accessoryInline:
          Text("№\(dispatchNumber(fact.source?.factId ?? fact.source?.arxivId ?? fact.date)) \(fact.fact)")
            .font(.system(.caption2, design: .monospaced))

        // Circular: "OHLO" wordmark + date (tiny face)
        case .accessoryCircular:
          VStack(spacing: 1) {
            Text("OHLO")
              .font(.system(.caption2, design: .monospaced))
              .fontWeight(.semibold)
              .widgetAccentable()
            Text(todayShortLabel())
              .font(.system(.caption2, design: .monospaced))
          }

        // Corner: "OHLO" in corner body; widgetLabel shows truncated fact
        case .accessoryCorner:
          Text("OHLO")
            .font(.system(.caption2, design: .monospaced))
            .fontWeight(.semibold)
            .widgetLabel {
              Text(fact.fact)
                .font(.system(.caption2, design: .serif))
            }

        // Rectangular: fact body (hero) + tiny source stamp below — most screen real estate
        default: // accessoryRectangular
          VStack(alignment: .leading, spacing: 2) {
            Text(fact.fact)
              .font(.system(.caption, design: .serif))
              .lineLimit(3)
              .minimumScaleFactor(0.85)
              .layoutPriority(1)
            if let stamp = stampText(fact.source) {
              Text(stamp)
                .font(.system(.caption2, design: .monospaced))
                .minimumScaleFactor(0.75)
                .lineLimit(1)
                .widgetAccentable()
            } else {
              Text("№ \(dispatchNumber(fact.source?.factId ?? fact.source?.arxivId ?? fact.date))")
                .font(.system(.caption2, design: .monospaced))
                .widgetAccentable()
            }
          }
        }
      } else {
        // No fact yet — show wordmark
        Text("OHLO")
          .font(.system(.caption2, design: .monospaced))
          .fontWeight(.semibold)
      }
    }
    .containerBackground(for: .widget) { Color.black }
  }
}

@main
struct OhloWatchWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "OhloWatchFact", provider: FactProvider()) { entry in
      ComplicationView(entry: entry)
    }
    .configurationDisplayName("Ohlo")
    .description("每日一条为你定制的冷知识")
    .supportedFamilies([
      .accessoryInline, .accessoryRectangular, .accessoryCircular, .accessoryCorner,
    ])
  }
}
