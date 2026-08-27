import Capacitor
import Foundation
import UIKit

@objc(JournalVideoRecorderPlugin)
public final class JournalVideoRecorderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "JournalVideoRecorderPlugin"
    public let jsName = "JournalVideoRecorder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startJournalVideoCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getJournalVideoCaptureState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listPendingJournalVideoCaptures", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPendingJournalVideoCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledgePendingJournalVideoCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "discardPendingJournalVideoCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resumePendingJournalVideoCapture", returnType: CAPPluginReturnPromise)
    ]

    private var coordinator: JournalVideoCaptureCoordinator?
    private var initializationError: Error?

    public override func load() {
        do {
            let coordinator = try JournalVideoCaptureCoordinator(fileManager: .default)
            coordinator.eventSink = self
            self.coordinator = coordinator
        } catch {
            initializationError = error
        }
    }

    @objc public func startJournalVideoCapture(_ call: CAPPluginCall) {
        do {
            let coordinator = try requireCoordinator()
            let options = try startOptions(from: call)
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                do {
                    guard let presenter = self.bridge?.viewController else {
                        throw JournalVideoCaptureError.captureUnavailable(
                            "The native journal recorder cannot find its app window."
                        )
                    }
                    let manifest = try coordinator.start(options: options, presenter: presenter)
                    call.resolve(manifest.stateDictionary())
                } catch {
                    call.reject(error.localizedDescription, nil, error)
                }
            }
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc public func getJournalVideoCaptureState(_ call: CAPPluginCall) {
        resolveCapture(call)
    }

    @objc public func listPendingJournalVideoCaptures(_ call: CAPPluginCall) {
        do {
            let captures = try requireCoordinator().recoverableCaptures().map { manifest -> [String: Any] in
                var descriptor = manifest.stateDictionary()
                descriptor["userId"] = manifest.userId
                descriptor["entryId"] = manifest.entryId
                descriptor["anchorOffset"] = manifest.anchorOffset
                if manifest.state == .pendingHandoff,
                   let result = try? requireCoordinator().pendingResult(sessionId: manifest.sessionId) {
                    descriptor.merge(result.dictionary()) { _, resultValue in resultValue }
                }
                return descriptor
            }
            call.resolve(["captures": captures])
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc public func getPendingJournalVideoCapture(_ call: CAPPluginCall) {
        do {
            let sessionId = try requiredSessionId(from: call)
            let result = try requireCoordinator().pendingResult(sessionId: sessionId)
            call.resolve(result.dictionary())
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc public func acknowledgePendingJournalVideoCapture(_ call: CAPPluginCall) {
        acknowledge(call)
    }

    @objc public func discardPendingJournalVideoCapture(_ call: CAPPluginCall) {
        discard(call)
    }

    @objc public func resumePendingJournalVideoCapture(_ call: CAPPluginCall) {
        resume(call)
    }

    private func resolveCapture(_ call: CAPPluginCall) {
        do {
            let coordinator = try requireCoordinator()
            let sessionId = try requiredSessionId(from: call)
            let manifest = try coordinator.state(sessionId: sessionId)
            call.resolve(manifest.stateDictionary())
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    private func acknowledge(_ call: CAPPluginCall) {
        do {
            let sessionId = try requiredSessionId(from: call)
            try requireCoordinator().acknowledge(sessionId: sessionId)
            call.resolve(["sessionId": sessionId, "acknowledged": true])
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    private func discard(_ call: CAPPluginCall) {
        do {
            let sessionId = try requiredSessionId(from: call)
            requireCoordinator().discard(sessionId: sessionId) { result in
                switch result {
                case .success:
                    call.resolve(["sessionId": sessionId, "state": "discarded"])
                case .failure(let error):
                    call.reject(error.localizedDescription, nil, error)
                }
            }
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    private func resume(_ call: CAPPluginCall) {
        do {
            let coordinator = try requireCoordinator()
            let sessionId = try requiredSessionId(from: call)
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                do {
                    guard let presenter = self.bridge?.viewController else {
                        throw JournalVideoCaptureError.captureUnavailable(
                            "The native journal recorder cannot find its app window."
                        )
                    }
                    let manifest = try coordinator.resume(
                        sessionId: sessionId,
                        presenter: presenter
                    )
                    var payload = manifest.stateDictionary()
                    if manifest.state == .pendingHandoff,
                       let result = try? coordinator.pendingResult(sessionId: sessionId) {
                        payload.merge(result.dictionary()) { _, resultValue in resultValue }
                    }
                    call.resolve(payload)
                } catch {
                    call.reject(error.localizedDescription, nil, error)
                }
            }
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    private func startOptions(from call: CAPPluginCall) throws -> JournalVideoCaptureStartOptions {
        guard let userId = call.getString("userId")?.trimmingCharacters(in: .whitespacesAndNewlines),
              !userId.isEmpty else {
            throw JournalVideoCaptureError.invalidState("A user id is required for native capture.")
        }
        guard let entryId = call.getString("entryId")?.trimmingCharacters(in: .whitespacesAndNewlines),
              !entryId.isEmpty else {
            throw JournalVideoCaptureError.invalidState("An entry id is required for native capture.")
        }
        let requestedDuration = Int64(call.getInt("maxDurationMs") ?? Int(JournalVideoLimits.hardDurationMs))
        let requestedBytes = Int64(call.getInt("maxBytes") ?? Int(JournalVideoLimits.recordingBytes))
        let duration = min(
            JournalVideoLimits.hardDurationMs,
            max(JournalVideoLimits.minimumDurationMs, requestedDuration)
        )
        let bytes = min(
            JournalVideoLimits.recordingBytes,
            max(JournalVideoLimits.minimumBytes, requestedBytes)
        )
        let teleprompter = String((call.getString("teleprompter") ?? "").prefix(10_000))
        return JournalVideoCaptureStartOptions(
            sessionId: call.getString("sessionId") ?? UUID().uuidString,
            userId: userId,
            entryId: entryId,
            anchorOffset: call.getInt("anchorOffset") ?? 0,
            teleprompter: teleprompter,
            maxDurationMs: duration,
            maxBytes: bytes
        )
    }

    private func requiredSessionId(from call: CAPPluginCall) throws -> String {
        guard let sessionId = call.getString("sessionId"), !sessionId.isEmpty else {
            throw JournalVideoCaptureError.invalidSessionId
        }
        return sessionId
    }

    private func requireCoordinator() throws -> JournalVideoCaptureCoordinator {
        if let coordinator = coordinator { return coordinator }
        throw initializationError ?? JournalVideoCaptureError.captureUnavailable(
            "The native journal recorder failed to initialize."
        )
    }
}

extension JournalVideoRecorderPlugin: JournalVideoCaptureEventSink {
    func journalVideoCaptureDidEmit(event: String, data: [String: Any]) {
        notifyListeners(event, data: data)
    }
}

@objc(HolyParkAppBridgeViewController)
final class HolyParkAppBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(HolyParkNativePlugin())
        bridge?.registerPluginInstance(JournalVideoRecorderPlugin())
    }
}
