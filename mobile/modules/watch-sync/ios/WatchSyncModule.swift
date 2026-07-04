import ExpoModulesCore
import WatchConnectivity

/// Minimal WCSession wrapper: pushes the daily fact JSON to the paired
/// watch via applicationContext (persists until replaced; delivered even
/// when the watch app isn't running).
final class WatchSessionHolder: NSObject, WCSessionDelegate {
  static let shared = WatchSessionHolder()
  private var pendingFact: String?

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    if session.delegate == nil || session.activationState != .activated {
      session.delegate = self
      session.activate()
    }
  }

  func send(_ json: String) {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    if session.activationState == .activated {
      try? session.updateApplicationContext(["todayFact": json])
    } else {
      pendingFact = json
      activate()
    }
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if activationState == .activated, let fact = pendingFact {
      try? session.updateApplicationContext(["todayFact": fact])
      pendingFact = nil
    }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }
}

public class WatchSyncModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WatchSync")

    OnCreate {
      WatchSessionHolder.shared.activate()
    }

    Function("sendFact") { (json: String) -> Bool in
      WatchSessionHolder.shared.send(json)
      return true
    }
  }
}
