import WidgetKit
import SwiftUI

// Must match APP_GROUP / WIDGET_FACT_KEY in src/lib/config.ts.
let appGroup = "group.com.ohlo.daily"
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

/// Today's local date as yyyy-MM-dd (Calendar.current), to match how the app
/// stores fact.date. Used to detect a stale (yesterday's) fact on the widget.
func todayLocalDateString() -> String {
  let formatter = DateFormatter()
  formatter.calendar = Calendar.current
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter.string(from: Date())
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
    if let label = source.label, !label.isEmpty { return "⌖ \(label) ✓" }
    if let arxiv = source.arxivId, !arxiv.isEmpty { return "⌖ arXiv:\(arxiv) ✓" }
    return nil
  }

  // Language detection: use explicit payload field when present; fall back to
  // a CJK-character heuristic on the fact text (no CJK → "en").
  private func effectiveLanguage(_ fact: SharedFact) -> String {
    if let lang = fact.language, !lang.isEmpty { return lang }
    let isCJK = fact.fact.unicodeScalars.contains { s in
      (0x4E00...0x9FFF ~= s.value) ||  // CJK Unified Ideographs
      (0x3040...0x30FF ~= s.value) ||  // Hiragana / Katakana
      (0xAC00...0xD7AF ~= s.value)     // Hangul
    }
    return isCJK ? "zh" : "en"
  }

  private func ctaText(_ fact: SharedFact) -> String {
    effectiveLanguage(fact) == "zh" ? "寄给你的理由" : "Why it found you"
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
        Text("打开 Ohlo 生成今日信笺")
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
    VStack(alignment: .leading, spacing: big ? 6 : 4) {
      // Header row — № de-emphasized (caption, muted); date carries color weight.
      HStack {
        Text(dispatchLabel(fact))
          .font(.system(big ? .caption : .caption2, design: .monospaced))
          .foregroundStyle(paraSoft)                        // muted, not persimmon
        Spacer()
        // Stale signal: a fact from a prior day shows its date in muted gray
        // instead of marigold — a subtle cue the app hasn't refreshed today.
        Text(fact.date)
          .font(.system(.caption2, design: .monospaced))
          .foregroundStyle(fact.date == todayLocalDateString() ? marigold : paraSoft)
      }
      // Fact body — highest layout priority so stamps yield space first.
      Text(fact.fact)
        .font(.system(big ? .subheadline : .footnote, design: .serif))
        .foregroundStyle(paraInk)
        .lineLimit(big ? 4 : 5)
        .minimumScaleFactor(0.85)
        .layoutPriority(1)
      Spacer(minLength: 4)
      // Bottom row: source stamp (left) + CTA pill (right) for medium;
      // pill only for small — source stamp dropped to give pill room.
      if big {
        HStack(alignment: .center, spacing: 8) {
          if let stamp = stampText(fact.source) {
            Text(stamp)
              .font(.system(.caption2, design: .monospaced))
              .foregroundStyle(postmark)
              .minimumScaleFactor(0.8)
              .lineLimit(1)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .overlay(RoundedRectangle(cornerRadius: 4).stroke(postmark, lineWidth: 1.5))
              .layoutPriority(0)
          }
          Spacer(minLength: 0)
          Text(ctaText(fact))
            .font(.system(.caption2))
            .foregroundStyle(persimmon)
            .lineLimit(1)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .overlay(Capsule().stroke(persimmon, lineWidth: 1.5))
        }
        .fixedSize(horizontal: false, vertical: true)
      } else {
        Text(ctaText(fact))
          .font(.system(.caption2))
          .foregroundStyle(persimmon)
          .lineLimit(1)
          .padding(.horizontal, 10)
          .padding(.vertical, 4)
          .overlay(Capsule().stroke(persimmon, lineWidth: 1.5))
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    // No fold edge here: at widget scale the paper-fold strip reads as a
    // stray gray bar, not a fold (founder feedback). The app card keeps it.
    .padding(.bottom, 6)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

struct OhloWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "OhloDailyFact", provider: FactProvider()) { entry in
      FactWidgetView(entry: entry)
    }
    .configurationDisplayName("Ohlo")
    .description("每日一条为你定制的冷知识")
    .supportedFamilies([
      .systemSmall, .systemMedium,
      .accessoryInline, .accessoryRectangular,
    ])
  }
}

@main
struct OhloWidgetBundle: WidgetBundle {
  var body: some Widget {
    OhloWidget()
  }
}
