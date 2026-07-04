import WidgetKit
import SwiftUI

// Must match APP_GROUP / WIDGET_FACT_KEY in src/lib/config.ts.
let appGroup = "group.com.knowtok.daily"
let factKey = "todayFact"

// The Daily Dispatch palette — the widget IS a cream slip on the dark desk.
// Literal colors (asset-catalog colors don't reliably ship in the appex).
let paper = Color(red: 0.953, green: 0.914, blue: 0.839) // #F3E9D6
let paperEdge = Color(red: 0.894, green: 0.839, blue: 0.737) // #E4D6BC
let paraInk = Color(red: 0.141, green: 0.118, blue: 0.082) // #241E15
let paraSoft = Color(red: 0.420, green: 0.369, blue: 0.282) // #6B5E48
let persimmon = Color(red: 0.925, green: 0.290, blue: 0.141) // #EC4A24
let marigold = Color(red: 0.949, green: 0.651, blue: 0.231) // #F2A63B
let postmark = Color(red: 0.110, green: 0.361, blue: 0.388) // #1C5C63

/// Deterministic dispatch № — djb2 over the factId's UTF-8 bytes, UInt32
/// wrapping, 1000 + (hash % 9000). MUST match dispatchNumber() in
/// src/components/slipUtils.ts so app and widget agree.
func dispatchNumber(_ id: String) -> Int {
  var h: UInt32 = 5381
  for b in id.utf8 { h = h &* 33 &+ UInt32(b) }
  return 1000 + Int(h % 9000)
}

// Mirrors the DailyFact shape written by the React Native app.
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
        source: FactSource(
          kind: "paper", factId: "sample-0001", label: "arXiv:2401.00000",
          paperId: "", arxivId: "2401.00000", title: "", url: "", publishedAt: ""
        )
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (FactEntry) -> Void) {
    completion(FactEntry(date: Date(), fact: loadSharedFact() ?? placeholder(in: context).fact))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<FactEntry>) -> Void) {
    let entry = FactEntry(date: Date(), fact: loadSharedFact())
    // The app reloads the timeline whenever it writes a new fact; this
    // hourly refresh just keeps the date footer honest if the app isn't opened.
    let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct FactWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: FactEntry

  private func dispatchLabel(_ fact: SharedFact) -> String {
    "№ \(dispatchNumber(fact.source?.factId ?? fact.source?.arxivId ?? fact.date))"
  }

  private func stampText(_ source: FactSource?) -> String? {
    guard let source else { return nil }
    if let arxiv = source.arxivId, !arxiv.isEmpty { return "⌖ arXiv:\(arxiv) ✓" }
    if let label = source.label, !label.isEmpty { return "⌖ \(label) ✓" }
    return nil
  }

  var body: some View {
    Group {
      if let fact = entry.fact {
        switch family {
        // Lock screen (monochrome): № + one clause, stamp-typeset.
        case .accessoryInline:
          Text("\(dispatchLabel(fact)) · \(fact.fact)")
            .font(.system(.caption, design: .monospaced))
        case .accessoryRectangular:
          VStack(alignment: .leading, spacing: 2) {
            Text(dispatchLabel(fact))
              .font(.system(.caption2, design: .monospaced))
              .widgetAccentable()
            Text(fact.fact)
              .font(.system(.caption, design: .serif))
              .lineLimit(3)
          }
        case .systemSmall:
          slip(fact, big: false)
        default: // systemMedium and larger
          slip(fact, big: true)
        }
      } else {
        Text("打开 KnowTok 生成今日信笺")
          .font(.system(.footnote, design: .serif))
          .foregroundStyle(paraSoft)
      }
    }
    .containerBackground(for: .widget) { paper }
  }

  // The cream slip: № top-left, serif fact, tilted teal source stamp,
  // 4px fold edge along the bottom.
  @ViewBuilder
  private func slip(_ fact: SharedFact, big: Bool) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text(dispatchLabel(fact))
          .font(.system(big ? .subheadline : .caption, design: .monospaced))
          .fontWeight(.bold)
          .foregroundStyle(persimmon)
        Spacer()
        Text(fact.date)
          .font(.system(.caption2, design: .monospaced))
          .foregroundStyle(marigold)
      }
      Text(fact.fact)
        .font(.system(big ? .subheadline : .footnote, design: .serif))
        .foregroundStyle(paraInk)
        .lineLimit(big ? 4 : 6)
        .minimumScaleFactor(0.8)
      Spacer(minLength: 0)
      if let stamp = stampText(fact.source) {
        Text(stamp)
          .font(.system(.caption2, design: .monospaced))
          .foregroundStyle(postmark)
          .padding(.horizontal, 6)
          .padding(.vertical, 2)
          .overlay(RoundedRectangle(cornerRadius: 4).stroke(postmark, lineWidth: 1.5))
          .rotationEffect(.degrees(-1.2))
          .lineLimit(1)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .overlay(alignment: .bottom) {
      Rectangle().fill(paperEdge).frame(height: 4)
    }
  }
}

struct KnowTokWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "KnowTokDailyFact", provider: FactProvider()) { entry in
      FactWidgetView(entry: entry)
    }
    .configurationDisplayName("KnowTok Daily")
    .description("每日一条为你定制的冷知识")
    .supportedFamilies([
      .systemSmall, .systemMedium,
      .accessoryInline, .accessoryRectangular,
    ])
  }
}

@main
struct KnowTokWidgetBundle: WidgetBundle {
  var body: some Widget {
    KnowTokWidget()
  }
}
