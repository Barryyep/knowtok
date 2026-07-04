import SwiftUI
import WatchConnectivity
import WidgetKit

// Must match the phone app (src/lib/config.ts) and the complication.
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

// The Daily Dispatch palette (cream slip on the dark desk).
let paper = Color(red: 0.953, green: 0.914, blue: 0.839) // #F3E9D6
let paperEdge = Color(red: 0.894, green: 0.839, blue: 0.737) // #E4D6BC
let paraInk = Color(red: 0.141, green: 0.118, blue: 0.082) // #241E15
let persimmon = Color(red: 0.925, green: 0.290, blue: 0.141) // #EC4A24
let marigold = Color(red: 0.949, green: 0.651, blue: 0.231) // #F2A63B
let postmark = Color(red: 0.110, green: 0.361, blue: 0.388) // #1C5C63

/// djb2 dispatch № — mirrors src/components/slipUtils.ts and the widgets.
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

  var body: some View {
    ScrollView {
      if let fact = sync.fact {
        VStack(alignment: .leading, spacing: 6) {
          HStack {
            Text("№ \(dispatchNumber(fact.source?.factId ?? fact.source?.arxivId ?? fact.date))")
              .font(.system(.footnote, design: .monospaced))
              .fontWeight(.bold)
              .foregroundStyle(persimmon)
            Spacer()
            Text("\(fact.emoji) \(fact.topic)")
              .font(.system(.caption2, design: .monospaced))
              .foregroundStyle(marigold)
          }
          Text(fact.fact)
            .font(.system(.body, design: .serif))
            .foregroundStyle(paraInk)
          if let source = fact.source, let arxiv = source.arxivId, !arxiv.isEmpty {
            Text("⌖ arXiv:\(arxiv) ✓")
              .font(.system(.caption2, design: .monospaced))
              .foregroundStyle(postmark)
          }
        }
        .padding(10)
        .background(paper)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(alignment: .bottom) {
          Rectangle().fill(paperEdge).frame(height: 4)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
      } else {
        VStack(spacing: 8) {
          Text("💌").font(.largeTitle)
          Text("在 iPhone 上打开 KnowTok\n同步今日信笺")
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
struct KnowTokWatchApp: App {
  @StateObject private var sync = PhoneSync()

  var body: some Scene {
    WindowGroup {
      ContentView(sync: sync)
    }
  }
}
