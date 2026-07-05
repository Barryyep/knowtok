import SwiftUI
import WatchConnectivity
import WidgetKit

// Must match the phone app (src/lib/config.ts) and the complication.
let appGroup = "group.com.ohlo.daily"
let factKey = "todayFact"

// The Daily Dispatch palette (cream slip on the dark desk).
let paper     = Color(red: 0.953, green: 0.914, blue: 0.839) // #F3E9D6
let paraInk   = Color(red: 0.141, green: 0.118, blue: 0.082) // #241E15
let paraSoft  = Color(red: 0.420, green: 0.369, blue: 0.282) // #6B5E48
let persimmon = Color(red: 0.925, green: 0.290, blue: 0.141) // #EC4A24
let marigold  = Color(red: 0.949, green: 0.651, blue: 0.231) // #F2A63B
let postmark  = Color(red: 0.110, green: 0.361, blue: 0.388) // #1C5C63

/// djb2 dispatch № — mirrors src/components/slipUtils.ts and the widgets.
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
  var language: String?  // "zh" | "en"; optional — older payloads omit this field
}

func decodeFact(_ raw: String?) -> SharedFact? {
  guard let raw, let data = raw.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(SharedFact.self, from: data)
}

/// Receives the daily fact from the iPhone (applicationContext survives
/// even when this app is closed), persists it to the watch-local App
/// Group, and reloads the complication.
final class PhoneSync: NSObject, WCSessionDelegate, ObservableObject {
  @Published var fact: SharedFact?

  override init() {
    super.init()
    let defaults = UserDefaults(suiteName: appGroup)
    fact = decodeFact(defaults?.string(forKey: factKey))
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  private func store(_ raw: String) {
    UserDefaults(suiteName: appGroup)?.set(raw, forKey: factKey)
    let parsed = decodeFact(raw)
    DispatchQueue.main.async { self.fact = parsed }
    WidgetCenter.shared.reloadAllTimelines()
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if let raw = session.receivedApplicationContext[factKey] as? String {
      store(raw)
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
    if let raw = context[factKey] as? String {
      store(raw)
    }
  }
}

struct ContentView: View {
  @ObservedObject var sync: PhoneSync

  // Language detection: explicit payload field; fall back to CJK-character heuristic.
  private func effectiveLanguage(_ fact: SharedFact) -> String {
    if let lang = fact.language, !lang.isEmpty { return lang }
    let isCJK = fact.fact.unicodeScalars.contains { s in
      (0x4E00...0x9FFF ~= s.value) ||  // CJK Unified Ideographs
      (0x3040...0x30FF ~= s.value) ||  // Hiragana / Katakana
      (0xAC00...0xD7AF ~= s.value)     // Hangul
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
    ScrollView {
      if let fact = sync.fact {
        VStack(alignment: .leading, spacing: 8) {
          // Header: № muted (paraSoft, caption2) + topic accent (marigold)
          HStack {
            Text("№ \(dispatchNumber(fact.source?.factId ?? fact.source?.arxivId ?? fact.date))")
              .font(.system(.caption2, design: .monospaced))
              .foregroundStyle(paraSoft)             // muted — not persimmon
            Spacer()
            Text(fact.topic)
              .font(.system(.caption2))
              .foregroundStyle(marigold)
              .lineLimit(1)
          }

          // Fact body — the hero at watch scale
          Text(fact.fact)
            .font(.system(.footnote, design: .serif))
            .foregroundStyle(paraInk)
            .fixedSize(horizontal: false, vertical: true)

          // Source stamp — single line, scales before truncating, no clipping
          if let stamp = stampText(fact.source) {
            Text(stamp)
              .font(.system(.caption2, design: .monospaced))
              .foregroundStyle(postmark)
              .minimumScaleFactor(0.75)
              .lineLimit(1)
          }
        }
        .padding(10)
        .background(paper)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        // No fold edge at watch scale — reads as a stray bar, not a fold.
      } else {
        VStack(spacing: 8) {
          Text("在 iPhone 上打开 Ohlo\n同步今日信笺")
            .font(.system(.footnote, design: .serif))
            .multilineTextAlignment(.center)
            .foregroundStyle(.gray)
        }
        .padding(.top, 20)
      }
    }
  }
}

@main
struct OhloWatchApp: App {
  @StateObject private var sync = PhoneSync()

  var body: some Scene {
    WindowGroup {
      ContentView(sync: sync)
    }
  }
}
