import WidgetKit
import SwiftUI

// Must match the watch app / phone app.
let appGroup = "group.com.knowtok.daily"
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

struct FactProvider: TimelineProvider {
  func placeholder(in context: Context) -> FactEntry {
    FactEntry(
      date: Date(),
      fact: SharedFact(
        date: "2026-01-01",
        emoji: "🤖",
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
    let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct ComplicationView: View {
  @Environment(\.widgetFamily) var family
  let entry: FactEntry

  var body: some View {
    Group {
      if let fact = entry.fact {
        switch family {
        case .accessoryInline:
          Text(fact.topic)
        case .accessoryCircular:
          VStack(spacing: 0) {
            Text("K").font(.system(.title3, design: .serif)).fontWeight(.bold)
          }
        case .accessoryCorner:
          Text("K")
            .font(.system(.title3, design: .serif))
            .fontWeight(.bold)
            .widgetLabel(fact.topic)
        default: // accessoryRectangular
          VStack(alignment: .leading, spacing: 1) {
            Text("№ \(dispatchNumber(fact.source?.factId ?? fact.source?.arxivId ?? fact.date)) · \(fact.topic)")
              .font(.system(.caption, design: .monospaced))
              .widgetAccentable()
            Text(fact.fact)
              .font(.system(.caption2, design: .serif))
              .lineLimit(2)
          }
        }
      } else {
        Text("K").font(.system(.title3, design: .serif)).fontWeight(.bold)
      }
    }
    .containerBackground(for: .widget) { Color.black }
  }
}

@main
struct KnowTokWatchWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "KnowTokWatchFact", provider: FactProvider()) { entry in
      ComplicationView(entry: entry)
    }
    .configurationDisplayName("KnowTok Daily")
    .description("每日一条为你定制的冷知识")
    .supportedFamilies([
      .accessoryInline, .accessoryRectangular, .accessoryCircular, .accessoryCorner,
    ])
  }
}
