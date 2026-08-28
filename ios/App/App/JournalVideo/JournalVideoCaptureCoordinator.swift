import Foundation
import UIKit

protocol JournalVideoCaptureEventSink: AnyObject {
    func journalVideoCaptureDidEmit(event: String, data: [String: Any])
}

final class JournalVideoCaptureCoordinator: NSObject {
    weak var eventSink: JournalVideoCaptureEventSink?

    private let store: JournalVideoCaptureStore
    private let exporter: JournalVideoCaptureExporter
    private var activeSession: JournalVideoCaptureSession?
    private var activeController: JournalVideoRecorderViewController?
    private var activeSessionId: String?
    private var discardCompletion: ((Result<Void, Error>) -> Void)?

    init(fileManager: FileManager) throws {
        let store = try JournalVideoCaptureStore(fileManager: fileManager)
        self.store = store
        exporter = JournalVideoCaptureExporter(store: store)
        super.init()
    }

    func start(
        options: JournalVideoCaptureStartOptions,
        presenter: UIViewController
    ) throws -> JournalVideoCaptureManifest {
        dispatchPrecondition(condition: .onQueue(DispatchQueue.main))
        guard activeSession == nil else { throw JournalVideoCaptureError.recorderBusy }
        let manifest = try store.create(options: options)
        launch(manifest: manifest, presenter: presenter)
        return manifest
    }

    func resume(
        sessionId: String,
        presenter: UIViewController
    ) throws -> JournalVideoCaptureManifest {
        dispatchPrecondition(condition: .onQueue(DispatchQueue.main))
        if activeSessionId == sessionId,
           let controller = activeController,
           let active = activeSession {
            if controller.presentingViewController == nil {
                topPresenter(from: presenter).present(controller, animated: true)
            }
            return try store.manifest(sessionId: sessionId)
        }
        guard activeSession == nil else { throw JournalVideoCaptureError.recorderBusy }
        let existing = try store.manifest(sessionId: sessionId)
        guard existing.state != .pendingHandoff else { return existing }
        guard existing.committedBytes > 0 || existing.state == .failed else {
            throw JournalVideoCaptureError.noRecordedMedia
        }
        let manifest = try store.prepareForResume(sessionId: sessionId)
        launch(manifest: manifest, presenter: presenter)
        return manifest
    }

    func state(sessionId: String) throws -> JournalVideoCaptureManifest {
        try store.manifest(sessionId: sessionId)
    }

    func recoverableCaptures() -> [(
        manifest: JournalVideoCaptureManifest,
        isActiveSession: Bool
    )] {
        dispatchPrecondition(condition: .onQueue(DispatchQueue.main))
        var captures = store.listRecoverable()
        if let activeSessionId = activeSessionId,
           !captures.contains(where: { $0.sessionId == activeSessionId }),
           let activeManifest = try? store.manifest(sessionId: activeSessionId) {
            captures.insert(activeManifest, at: 0)
        }
        return captures.map { manifest in
            (manifest, manifest.sessionId == activeSessionId)
        }
    }

    func pendingResult(sessionId: String) throws -> JournalVideoPendingResult {
        try store.pendingResult(sessionId: sessionId)
    }

    func acknowledge(sessionId: String) throws {
        guard activeSessionId != sessionId else {
            throw JournalVideoCaptureError.invalidState(
                "The journal video recorder is still using this session."
            )
        }
        let manifest = try store.manifest(sessionId: sessionId)
        guard manifest.state == .pendingHandoff else {
            throw JournalVideoCaptureError.invalidState(
                "A journal video can be acknowledged only after durable queue handoff."
            )
        }
        try store.delete(sessionId: sessionId)
    }

    func discard(
        sessionId: String,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if self.activeSessionId == sessionId, let session = self.activeSession {
                guard self.discardCompletion == nil else {
                    completion(.failure(JournalVideoCaptureError.invalidState(
                        "The journal video is already being discarded."
                    )))
                    return
                }
                self.discardCompletion = completion
                session.discard()
                return
            }
            do {
                try self.store.delete(sessionId: sessionId)
                completion(.success(()))
            } catch {
                completion(.failure(error))
            }
        }
    }

    private func launch(
        manifest: JournalVideoCaptureManifest,
        presenter: UIViewController
    ) {
        let session = JournalVideoCaptureSession(
            manifest: manifest,
            store: store,
            exporter: exporter
        )
        let controller = JournalVideoRecorderViewController(
            manifest: manifest,
            captureSession: session.captureSession
        )
        session.attachPreviewLayer(controller.capturePreviewLayer)
        session.delegate = self
        controller.delegate = self
        activeSession = session
        activeController = controller
        activeSessionId = manifest.sessionId
        topPresenter(from: presenter).present(controller, animated: true)
        emit(event: "journalVideoStateChanged", data: manifest.stateDictionary())
        session.prepare { [weak controller] result in
            if case .failure(let error) = result {
                DispatchQueue.main.async { controller?.showError(error.localizedDescription) }
            }
        }
    }

    private func topPresenter(from root: UIViewController) -> UIViewController {
        var presenter = root
        while let next = presenter.presentedViewController,
              !next.isBeingDismissed {
            presenter = next
        }
        return presenter
    }

    private func dismissAndRelease(session: JournalVideoCaptureSession) {
        guard activeSession === session else { return }
        let controller = activeController
        activeSession = nil
        activeController = nil
        activeSessionId = nil
        session.shutdown()
        if controller?.presentingViewController != nil {
            controller?.dismiss(animated: true)
        }
    }

    private func emit(event: String, data: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            self?.eventSink?.journalVideoCaptureDidEmit(event: event, data: data)
        }
    }
}

extension JournalVideoCaptureCoordinator: JournalVideoCaptureSessionDelegate {
    func journalVideoSession(
        _ session: JournalVideoCaptureSession,
        didUpdate manifest: JournalVideoCaptureManifest
    ) {
        activeController?.apply(manifest: manifest)
        emit(event: "journalVideoStateChanged", data: manifest.stateDictionary())
    }

    func journalVideoSession(
        _ session: JournalVideoCaptureSession,
        didProgress durationMs: Int64,
        bytes: Int64
    ) {
        activeController?.updateProgress(durationMs: durationMs, bytes: bytes)
        guard let manifest = try? store.manifest(sessionId: activeSessionId ?? "") else { return }
        emit(event: "journalVideoProgress", data: [
            "sessionId": manifest.sessionId,
            "userId": manifest.userId,
            "state": manifest.state.rawValue,
            "durationMs": durationMs,
            "bytes": bytes
        ])
    }

    func journalVideoSession(
        _ session: JournalVideoCaptureSession,
        didProduce result: JournalVideoPendingResult
    ) {
        let payload = result.dictionary()
        emit(event: "journalVideoStateChanged", data: payload)
        emit(event: "journalVideoReady", data: payload)
        dismissAndRelease(session: session)
    }

    func journalVideoSession(
        _ session: JournalVideoCaptureSession,
        didInterrupt reason: String
    ) {
        guard let id = activeSessionId,
              let manifest = try? store.manifest(sessionId: id) else { return }
        var payload = manifest.stateDictionary()
        payload["reason"] = reason
        emit(event: "journalVideoInterrupted", data: payload)
    }

    func journalVideoSession(_ session: JournalVideoCaptureSession, didFail error: Error) {
        activeController?.showError(error.localizedDescription)
    }

    func journalVideoSessionDidDiscard(_ session: JournalVideoCaptureSession) {
        let sessionId = activeSessionId
        dismissAndRelease(session: session)
        if let sessionId = sessionId {
            emit(event: "journalVideoStateChanged", data: [
                "sessionId": sessionId,
                "state": "discarded"
            ])
        }
        discardCompletion?(.success(()))
        discardCompletion = nil
    }
}

extension JournalVideoCaptureCoordinator: JournalVideoRecorderViewControllerDelegate {
    func journalVideoRecorderDidRequestRecord(_ controller: JournalVideoRecorderViewController) {
        activeSession?.startOrResumeRecording()
    }

    func journalVideoRecorderDidRequestPause(_ controller: JournalVideoRecorderViewController) {
        activeSession?.pauseManually()
    }

    func journalVideoRecorderDidRequestSave(_ controller: JournalVideoRecorderViewController) {
        activeSession?.stopAndFinalize()
    }

    func journalVideoRecorderDidRequestKeepDraft(_ controller: JournalVideoRecorderViewController) {
        guard let session = activeSession else { return }
        session.keepDraftAndClose { [weak self, weak session] in
            guard let self = self, let session = session else { return }
            self.dismissAndRelease(session: session)
        }
    }

    func journalVideoRecorderDidRequestDiscard(_ controller: JournalVideoRecorderViewController) {
        guard let sessionId = activeSessionId else { return }
        discard(sessionId: sessionId) { _ in }
    }

    func journalVideoRecorderDidRequestCameraSwitch(_ controller: JournalVideoRecorderViewController) {
        activeSession?.switchCamera()
    }

    func journalVideoRecorder(
        _ controller: JournalVideoRecorderViewController,
        didChange orientation: UIInterfaceOrientation
    ) {
        activeSession?.setInterfaceOrientation(orientation)
    }
}
