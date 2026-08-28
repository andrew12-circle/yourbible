import AVFoundation
import Foundation
import UIKit

protocol JournalVideoCaptureSessionDelegate: AnyObject {
    func journalVideoSession(
        _ session: JournalVideoCaptureSession,
        didUpdate manifest: JournalVideoCaptureManifest
    )
    func journalVideoSession(
        _ session: JournalVideoCaptureSession,
        didProgress durationMs: Int64,
        bytes: Int64
    )
    func journalVideoSession(
        _ session: JournalVideoCaptureSession,
        didProduce result: JournalVideoPendingResult
    )
    func journalVideoSession(
        _ session: JournalVideoCaptureSession,
        didInterrupt reason: String
    )
    func journalVideoSession(_ session: JournalVideoCaptureSession, didFail error: Error)
    func journalVideoSessionDidDiscard(_ session: JournalVideoCaptureSession)
}

final class JournalVideoCaptureSession: NSObject, AVCaptureFileOutputRecordingDelegate {
    let captureSession = AVCaptureSession()
    weak var delegate: JournalVideoCaptureSessionDelegate?

    private enum StopIntent: Equatable {
        case none
        case finish
        case discard
        case keepDraft
        case interrupt
    }

    private let store: JournalVideoCaptureStore
    private let exporter: JournalVideoCaptureExporter
    private let sessionId: String
    private let sessionQueue = DispatchQueue(
        label: "com.holypark.journal-video.capture",
        qos: .userInitiated
    )
    private let movieOutput = AVCaptureMovieFileOutput()
    private var videoInput: AVCaptureDeviceInput?
    private weak var previewLayer: AVCaptureVideoPreviewLayer?
    private var rotationCoordinator: AnyObject?
    private var configured = false
    private var cameraPosition: AVCaptureDevice.Position = .front
    private var desiredOrientation: AVCaptureVideoOrientation = .portrait
    private var stopIntent: StopIntent = .none
    private var pendingPauseState: JournalVideoCaptureState = .paused
    private var pendingPauseReason: String?
    private var pauseCompletion: (() -> Void)?
    private var progressTimer: DispatchSourceTimer?
    private var observers: [NSObjectProtocol] = []
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
    private var isShuttingDown = false
    private var appIsActive = true
    private var recordingIntentActive = false
    private var resumeAfterSystemInterruption = false
    private var interruptionInFlight = false
    private var restoreRetryAttempt = 0
    private var restoreRetryWorkItem: DispatchWorkItem?

    init(
        manifest: JournalVideoCaptureManifest,
        store: JournalVideoCaptureStore,
        exporter: JournalVideoCaptureExporter
    ) {
        sessionId = manifest.sessionId
        self.store = store
        self.exporter = exporter
        if let storedOrientation = Self.orientation(from: manifest.captureOrientation) {
            desiredOrientation = storedOrientation
        }
        if let storedCameraPosition = Self.cameraPosition(from: manifest.cameraPosition) {
            cameraPosition = storedCameraPosition
        }
        super.init()
        installObservers()
    }

    deinit {
        observers.forEach(NotificationCenter.default.removeObserver)
        progressTimer?.cancel()
        restoreRetryWorkItem?.cancel()
        endBackgroundTask()
    }

    func prepare(completion: @escaping (Result<JournalVideoCaptureManifest, Error>) -> Void) {
        requestPermission(for: .video, label: "Camera") { [weak self] videoGranted in
            guard let self = self else { return }
            guard videoGranted else {
                completion(.failure(JournalVideoCaptureError.permissionDenied("Camera")))
                return
            }
            self.requestPermission(for: .audio, label: "Microphone") { [weak self] audioGranted in
                guard let self = self else { return }
                guard audioGranted else {
                    completion(.failure(JournalVideoCaptureError.permissionDenied("Microphone")))
                    return
                }
                self.sessionQueue.async {
                    do {
                        try self.configureSessionIfNeeded()
                        if !self.captureSession.isRunning {
                            self.captureSession.startRunning()
                        }
                        let current = try self.store.manifest(sessionId: self.sessionId)
                        let readyState: JournalVideoCaptureState = current.committedBytes > 0
                            ? .interrupted
                            : .preview
                        let manifest = try self.updateManifest { value in
                            value.state = readyState
                            value.errorMessage = nil
                        }
                        self.emitUpdate(manifest)
                        completion(.success(manifest))
                    } catch {
                        self.recordFailure(error)
                        completion(.failure(error))
                    }
                }
            }
        }
    }

    func attachPreviewLayer(_ layer: AVCaptureVideoPreviewLayer) {
        sessionQueue.async { [weak self, weak layer] in
            guard let self = self else { return }
            self.previewLayer = layer
            if let camera = self.videoInput?.device {
                self.configureRotationCoordinator(for: camera)
            }
        }
    }

    func startOrResumeRecording() {
        sessionQueue.async { [weak self] in
            guard let self = self, !self.isShuttingDown else { return }
            guard !self.interruptionInFlight else { return }
            self.recordingIntentActive = true
            self.resumeAfterSystemInterruption = false
            self.interruptionInFlight = false
            self.cancelRestoreRetry()
            do {
                try self.startOrResumeRecordingOnQueue()
            } catch {
                self.recordingIntentActive = false
                self.recordFailure(error)
            }
        }
    }

    private func startOrResumeRecordingOnQueue() throws {
        try configureSessionIfNeeded()
        let manifest = try store.manifest(sessionId: sessionId)
        guard manifest.committedDurationMs < manifest.maxDurationMs,
              manifest.committedBytes < manifest.maxBytes else {
            recordingIntentActive = false
            resumeAfterSystemInterruption = false
            finalizeCommittedParts()
            return
        }

        stopIntent = .none
        pendingPauseReason = nil
        if movieOutput.isRecording {
            if movieOutput.isRecordingPaused {
                movieOutput.resumeRecording()
            }
            return
        }
        guard manifest.activeFileName == nil else { return }

        if !captureSession.isRunning {
            captureSession.startRunning()
        }
        guard captureSession.isRunning, !captureSession.isInterrupted else {
            resumeAfterSystemInterruption = true
            throw JournalVideoCaptureError.captureUnavailable(
                "The camera is still returning from an interruption."
            )
        }
        configureRecordingLimits(from: manifest)
        try applyRecordingOrientation(from: manifest)
        let starting = try updateManifest { value in
            value.state = .preparing
            value.interruptionReason = "Starting your recording…"
            value.errorMessage = nil
        }
        emitUpdate(starting)
        let outputURL = try store.allocateActivePart(sessionId: sessionId)
        try? FileManager.default.removeItem(at: outputURL)
        movieOutput.startRecording(to: outputURL, recordingDelegate: self)
    }

    func pauseManually() {
        sessionQueue.async { [weak self] in
            guard let self = self, !self.isShuttingDown else { return }
            self.recordingIntentActive = false
            self.resumeAfterSystemInterruption = false
            self.cancelRestoreRetry()
            self.requestPauseOnQueue(
                state: .paused,
                reason: "Recording paused.",
                completion: nil
            )
        }
    }

    func keepDraftAndClose(completion: @escaping () -> Void) {
        sessionQueue.async { [weak self] in
            guard let self = self, !self.isShuttingDown else {
                DispatchQueue.main.async(execute: completion)
                return
            }
            self.recordingIntentActive = false
            self.resumeAfterSystemInterruption = false
            self.cancelRestoreRetry()
            self.stopIntent = .keepDraft
            self.pendingPauseReason = "Recording saved as a draft to finish later."
            self.pauseCompletion = completion
            if self.movieOutput.isRecording {
                self.movieOutput.stopRecording()
            } else {
                do {
                    let manifest = try self.updateManifest { value in
                        value.state = .interrupted
                        value.interruptionReason = self.pendingPauseReason
                    }
                    self.emitUpdate(manifest)
                } catch {
                    self.recordFailure(error)
                }
                self.finishPauseCompletion()
            }
        }
    }

    func stopAndFinalize() {
        sessionQueue.async { [weak self] in
            guard let self = self, !self.isShuttingDown else { return }
            self.recordingIntentActive = false
            self.resumeAfterSystemInterruption = false
            self.cancelRestoreRetry()
            self.stopIntent = .finish
            self.pauseCompletion = nil
            if self.movieOutput.isRecording {
                self.movieOutput.stopRecording()
            } else {
                self.finalizeCommittedParts()
            }
        }
    }

    func discard() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            self.recordingIntentActive = false
            self.resumeAfterSystemInterruption = false
            self.cancelRestoreRetry()
            self.stopIntent = .discard
            self.isShuttingDown = true
            self.progressTimer?.cancel()
            self.progressTimer = nil
            if self.movieOutput.isRecording {
                self.movieOutput.stopRecording()
                return
            }
            self.finishDiscard()
        }
    }

    func switchCamera() {
        sessionQueue.async { [weak self] in
            guard let self = self,
                  self.configured,
                  !self.movieOutput.isRecording else { return }
            do {
                let manifest = try self.store.manifest(sessionId: self.sessionId)
                guard manifest.committedBytes == 0,
                      manifest.activeFileName == nil else { return }
                let nextPosition: AVCaptureDevice.Position = self.cameraPosition == .front
                    ? .back
                    : .front
                guard let device = AVCaptureDevice.default(
                    .builtInWideAngleCamera,
                    for: .video,
                    position: nextPosition
                ) else { return }
                let nextInput = try AVCaptureDeviceInput(device: device)
                let currentInput = self.videoInput
                self.captureSession.beginConfiguration()
                defer { self.captureSession.commitConfiguration() }
                if let current = currentInput {
                    self.captureSession.removeInput(current)
                }
                guard self.captureSession.canAddInput(nextInput) else {
                    if let current = currentInput,
                       self.captureSession.canAddInput(current) {
                        self.captureSession.addInput(current)
                    }
                    return
                }
                self.captureSession.addInput(nextInput)
                let updated: JournalVideoCaptureManifest
                do {
                    updated = try self.updateManifest { value in
                        value.cameraPosition = Self.name(for: nextPosition)
                        value.captureRotationDegrees = nil
                        value.previewRotationDegrees = nil
                    }
                } catch {
                    self.captureSession.removeInput(nextInput)
                    if let current = currentInput,
                       self.captureSession.canAddInput(current) {
                        self.captureSession.addInput(current)
                    }
                    throw error
                }
                self.videoInput = nextInput
                self.cameraPosition = nextPosition
                self.configureRotationCoordinator(for: device)
                self.emitUpdate(updated)
            } catch {
                self.recordFailure(error)
            }
        }
    }

    func setInterfaceOrientation(_ orientation: UIInterfaceOrientation) {
        guard let captureOrientation = Self.captureOrientation(from: orientation) else { return }
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            let manifest = try? self.store.manifest(sessionId: self.sessionId)
            if manifest?.captureOrientation == nil && !self.movieOutput.isRecording {
                self.desiredOrientation = captureOrientation
            }
        }
    }

    func shutdown() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            self.isShuttingDown = true
            self.recordingIntentActive = false
            self.resumeAfterSystemInterruption = false
            self.cancelRestoreRetry()
            self.progressTimer?.cancel()
            self.progressTimer = nil
            if self.captureSession.isRunning {
                self.captureSession.stopRunning()
            }
            let audioSession = AVAudioSession.sharedInstance()
            try? audioSession.setActive(false, options: [.notifyOthersOnDeactivation])
        }
    }

    private func requestPermission(
        for mediaType: AVMediaType,
        label: String,
        completion: @escaping (Bool) -> Void
    ) {
        switch AVCaptureDevice.authorizationStatus(for: mediaType) {
        case .authorized:
            completion(true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: mediaType, completionHandler: completion)
        case .denied, .restricted:
            completion(false)
        @unknown default:
            completion(false)
        }
    }

    private func configureSessionIfNeeded() throws {
        try activateAudioSession()
        guard !configured else { return }
        rotationCoordinator = nil

        captureSession.beginConfiguration()
        defer { captureSession.commitConfiguration() }
        for input in captureSession.inputs {
            captureSession.removeInput(input)
        }
        for output in captureSession.outputs {
            captureSession.removeOutput(output)
        }
        videoInput = nil
        if captureSession.canSetSessionPreset(.hd1280x720) {
            captureSession.sessionPreset = .hd1280x720
        }

        guard let camera = AVCaptureDevice.default(
            .builtInWideAngleCamera,
            for: .video,
            position: cameraPosition
        ) ?? AVCaptureDevice.default(for: .video) else {
            throw JournalVideoCaptureError.captureUnavailable("No camera is available.")
        }
        let cameraInput = try AVCaptureDeviceInput(device: camera)
        guard captureSession.canAddInput(cameraInput) else {
            throw JournalVideoCaptureError.captureUnavailable("The camera input could not be opened.")
        }
        captureSession.addInput(cameraInput)
        videoInput = cameraInput
        cameraPosition = camera.position
        configureRotationCoordinator(for: camera)
        _ = try updateManifest { value in
            value.cameraPosition = Self.name(for: camera.position)
        }

        guard let microphone = AVCaptureDevice.default(for: .audio) else {
            throw JournalVideoCaptureError.captureUnavailable("No microphone is available.")
        }
        let microphoneInput = try AVCaptureDeviceInput(device: microphone)
        guard captureSession.canAddInput(microphoneInput) else {
            throw JournalVideoCaptureError.captureUnavailable("The microphone input could not be opened.")
        }
        captureSession.addInput(microphoneInput)

        guard captureSession.canAddOutput(movieOutput) else {
            throw JournalVideoCaptureError.captureUnavailable("Video file recording is unavailable.")
        }
        captureSession.addOutput(movieOutput)
        movieOutput.movieFragmentInterval = CMTime(seconds: 1, preferredTimescale: 600)
        movieOutput.minFreeDiskSpaceLimit = 8 * 1_024 * 1_024
        configureOutputEncoding()
        configured = true
    }

    private func activateAudioSession() throws {
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(
            .playAndRecord,
            mode: .videoRecording,
            options: [.defaultToSpeaker, .allowBluetoothHFP]
        )
        try audioSession.setActive(true)
    }

    private func configureRotationCoordinator(for camera: AVCaptureDevice) {
        if #available(iOS 17.0, *) {
            rotationCoordinator = AVCaptureDevice.RotationCoordinator(
                device: camera,
                previewLayer: previewLayer
            )
        } else {
            rotationCoordinator = nil
        }
    }

    private func configureOutputEncoding() {
        if let connection = movieOutput.connection(with: .video) {
            var settings: [String: Any] = [:]
            let supported = Set(movieOutput.supportedOutputSettingsKeys(for: connection))
            if supported.contains(AVVideoCodecKey), movieOutput.availableVideoCodecTypes.contains(.h264) {
                settings[AVVideoCodecKey] = AVVideoCodecType.h264.rawValue
            }
            if supported.contains(AVVideoCompressionPropertiesKey) {
                settings[AVVideoCompressionPropertiesKey] = [
                    AVVideoAverageBitRateKey: 150_000,
                    AVVideoMaxKeyFrameIntervalKey: 30,
                    AVVideoExpectedSourceFrameRateKey: 30,
                    AVVideoProfileLevelKey: AVVideoProfileLevelH264MainAutoLevel
                ]
            }
            if !settings.isEmpty {
                movieOutput.setOutputSettings(settings, for: connection)
            }
            if connection.isVideoMirroringSupported {
                connection.automaticallyAdjustsVideoMirroring = false
                connection.isVideoMirrored = false
            }
        }
        if let connection = movieOutput.connection(with: .audio) {
            let supported = Set(movieOutput.supportedOutputSettingsKeys(for: connection))
            let proposed: [String: Any] = [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVEncoderBitRateKey: 32_000,
                AVSampleRateKey: 44_100,
                AVNumberOfChannelsKey: 1
            ]
            let settings = proposed.filter { supported.contains($0.key) }
            if !settings.isEmpty {
                movieOutput.setOutputSettings(settings, for: connection)
            }
        }
    }

    private func configureRecordingLimits(from manifest: JournalVideoCaptureManifest) {
        let remainingDuration = max(
            JournalVideoLimits.minimumDurationMs,
            manifest.maxDurationMs - manifest.committedDurationMs
        )
        let remainingBytes = max(
            JournalVideoLimits.minimumBytes,
            manifest.maxBytes - manifest.committedBytes
        )
        movieOutput.maxRecordedDuration = CMTime(
            milliseconds: remainingDuration,
            preferredTimescale: 1_000
        )
        movieOutput.maxRecordedFileSize = remainingBytes
    }

    private func applyRecordingOrientation(
        from manifest: JournalVideoCaptureManifest
    ) throws {
        let orientation = Self.orientation(from: manifest.captureOrientation) ?? desiredOrientation
        var rotationDegrees = manifest.captureRotationDegrees
        var previewRotationDegrees = manifest.previewRotationDegrees
        if #available(iOS 17.0, *), rotationDegrees == nil,
           manifest.parts.isEmpty,
           let coordinator = rotationCoordinator as? AVCaptureDevice.RotationCoordinator {
            rotationDegrees = Double(coordinator.videoRotationAngleForHorizonLevelCapture)
            previewRotationDegrees = Double(
                coordinator.videoRotationAngleForHorizonLevelPreview
            )
        }
        if let connection = movieOutput.connection(with: .video) {
            if #available(iOS 17.0, *), let rotationDegrees = rotationDegrees,
               connection.isVideoRotationAngleSupported(CGFloat(rotationDegrees)) {
                connection.videoRotationAngle = CGFloat(rotationDegrees)
            } else if connection.isVideoOrientationSupported {
                connection.videoOrientation = orientation
            }
        }
        let needsRotationPersistence = rotationDegrees != nil
            && manifest.captureRotationDegrees == nil
        let needsPreviewRotationPersistence = previewRotationDegrees != nil
            && manifest.previewRotationDegrees == nil
        if manifest.captureOrientation == nil
            || needsRotationPersistence
            || needsPreviewRotationPersistence {
            let name = Self.name(for: orientation)
            let updated = try updateManifest { value in
                if value.captureOrientation == nil { value.captureOrientation = name }
                if value.captureRotationDegrees == nil {
                    value.captureRotationDegrees = rotationDegrees
                }
                if value.previewRotationDegrees == nil {
                    value.previewRotationDegrees = previewRotationDegrees
                }
            }
            emitUpdate(updated)
        }
    }

    private func requestPauseOnQueue(
        state: JournalVideoCaptureState,
        reason: String,
        completion: (() -> Void)?
    ) {
        pendingPauseState = state
        pendingPauseReason = reason
        pauseCompletion = completion
        guard movieOutput.isRecording else {
            do {
                let manifest = try updateManifest { value in
                    value.state = state
                    value.interruptionReason = reason
                }
                emitUpdate(manifest)
                if state == .interrupted { emitInterruption(reason) }
            } catch {
                recordFailure(error)
            }
            finishPauseCompletion()
            return
        }
        if state == .interrupted {
            stopIntent = .interrupt
            beginBackgroundTaskIfNeeded()
            movieOutput.stopRecording()
            return
        }
        if movieOutput.isRecordingPaused {
            finishPause(state: state, reason: reason)
        } else {
            beginBackgroundTaskIfNeeded()
            movieOutput.pauseRecording()
        }
    }

    private func requestSystemInterruption(reason: String) {
        sessionQueue.async { [weak self] in
            guard let self = self, !self.isShuttingDown else { return }
            self.requestSystemInterruptionOnQueue(reason: reason)
        }
    }

    private func requestSystemInterruptionOnQueue(reason: String) {
        guard stopIntent != .finish,
              stopIntent != .discard,
              stopIntent != .keepDraft else { return }
        let wasActivelyRecording = recordingIntentActive
        guard wasActivelyRecording || movieOutput.isRecording else { return }
        if wasActivelyRecording {
            resumeAfterSystemInterruption = true
        }
        guard !interruptionInFlight else { return }
        cancelRestoreRetry()
        interruptionInFlight = true
        stopIntent = .interrupt
        requestPauseOnQueue(
            state: .interrupted,
            reason: reason,
            completion: nil
        )
    }

    private func finishPause(state: JournalVideoCaptureState, reason: String) {
        progressTimer?.cancel()
        progressTimer = nil
        persistProgress()
        do {
            let manifest = try updateManifest { value in
                value.state = state
                value.interruptionReason = reason
            }
            emitUpdate(manifest)
            if state == .interrupted { emitInterruption(reason) }
        } catch {
            recordFailure(error)
        }
        endBackgroundTask()
        finishPauseCompletion()
    }

    private func finishPauseCompletion() {
        let completion = pauseCompletion
        pauseCompletion = nil
        if let completion = completion {
            DispatchQueue.main.async(execute: completion)
        }
    }

    private func startProgressTimer() {
        progressTimer?.cancel()
        let timer = DispatchSource.makeTimerSource(queue: sessionQueue)
        timer.schedule(deadline: .now(), repeating: 1)
        timer.setEventHandler { [weak self] in self?.persistProgress() }
        progressTimer = timer
        timer.resume()
    }

    private func persistProgress() {
        guard movieOutput.isRecording else { return }
        do {
            let current = try store.manifest(sessionId: sessionId)
            let recordedSeconds = CMTimeGetSeconds(movieOutput.recordedDuration)
            let currentDuration = recordedSeconds.isFinite && recordedSeconds > 0
                ? Int64((recordedSeconds * 1_000).rounded())
                : 0
            let currentBytes = max(0, movieOutput.recordedFileSize)
            let totalDuration = current.committedDurationMs + currentDuration
            let totalBytes = current.committedBytes + currentBytes
            let manifest = try updateManifest { value in
                value.durationMs = totalDuration
                value.bytes = totalBytes
            }
            emitProgress(durationMs: totalDuration, bytes: totalBytes)

            let durationReached = totalDuration >= manifest.maxDurationMs - 250
            let bytesReached = totalBytes >= manifest.maxBytes - 64 * 1_024
            if (durationReached || bytesReached), stopIntent == .none {
                recordingIntentActive = false
                resumeAfterSystemInterruption = false
                stopIntent = .finish
                movieOutput.stopRecording()
            }
        } catch {
            recordFailure(error)
        }
    }

    private func finalizeCommittedParts() {
        recordingIntentActive = false
        resumeAfterSystemInterruption = false
        interruptionInFlight = false
        cancelRestoreRetry()
        do {
            let current = try store.manifest(sessionId: sessionId)
            guard !current.parts.isEmpty else {
                throw JournalVideoCaptureError.noRecordedMedia
            }
            let manifest = try updateManifest { value in
                value.state = .finalizing
                value.interruptionReason = nil
                value.errorMessage = nil
            }
            emitUpdate(manifest)
            exporter.export(sessionId: sessionId) { [weak self] result in
                guard let self = self else { return }
                switch result {
                case .success(let readyManifest):
                    do {
                        let pending = try self.store.pendingResult(sessionId: self.sessionId)
                        self.emitUpdate(readyManifest)
                        self.emitResult(pending)
                    } catch {
                        self.recordFailure(error)
                    }
                case .failure(let error):
                    self.recordFailure(error)
                }
            }
        } catch {
            recordFailure(error)
        }
    }

    private func finishDiscard() {
        do {
            try store.delete(sessionId: sessionId)
            shutdown()
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.delegate?.journalVideoSessionDidDiscard(self)
            }
        } catch {
            recordFailure(error)
        }
    }

    private func updateManifest(
        _ mutation: (inout JournalVideoCaptureManifest) throws -> Void
    ) throws -> JournalVideoCaptureManifest {
        try store.update(sessionId: sessionId, mutation)
    }

    private func recordFailure(_ error: Error) {
        recordingIntentActive = false
        resumeAfterSystemInterruption = false
        interruptionInFlight = false
        cancelRestoreRetry()
        let message = error.localizedDescription
        let manifest = try? updateManifest { value in
            value.state = value.committedBytes > 0 ? .interrupted : .failed
            value.errorMessage = message
            if value.committedBytes > 0 {
                value.interruptionReason = "Your recorded portion is still saved on this device."
            }
        }
        if let manifest = manifest { emitUpdate(manifest) }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.journalVideoSession(self, didFail: error)
        }
    }

    private func emitUpdate(_ manifest: JournalVideoCaptureManifest) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.journalVideoSession(self, didUpdate: manifest)
        }
    }

    private func emitProgress(durationMs: Int64, bytes: Int64) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.journalVideoSession(
                self,
                didProgress: durationMs,
                bytes: bytes
            )
        }
    }

    private func emitInterruption(_ reason: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.journalVideoSession(self, didInterrupt: reason)
        }
    }

    private func emitResult(_ result: JournalVideoPendingResult) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.journalVideoSession(self, didProduce: result)
        }
    }

    private func installObservers() {
        let center = NotificationCenter.default
        observers.append(center.addObserver(
            forName: AVCaptureSession.wasInterruptedNotification,
            object: captureSession,
            queue: nil
        ) { [weak self] notification in
            self?.handleCaptureInterruption(notification)
        })
        observers.append(center.addObserver(
            forName: AVCaptureSession.interruptionEndedNotification,
            object: captureSession,
            queue: nil
        ) { [weak self] _ in
            self?.handleInterruptionEnded()
        })
        observers.append(center.addObserver(
            forName: AVCaptureSession.runtimeErrorNotification,
            object: captureSession,
            queue: nil
        ) { [weak self] notification in
            self?.handleRuntimeError(notification)
        })
        observers.append(center.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance(),
            queue: nil
        ) { [weak self] notification in
            guard let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  let interruption = AVAudioSession.InterruptionType(rawValue: raw) else { return }
            switch interruption {
            case .began:
                self?.requestSystemInterruption(
                    reason: "Audio was interrupted by a call or another app."
                )
            case .ended:
                let rawOptions = notification.userInfo?[AVAudioSessionInterruptionOptionKey]
                    as? UInt ?? 0
                let options = AVAudioSession.InterruptionOptions(rawValue: rawOptions)
                if options.contains(.shouldResume) {
                    self?.restoreCaptureAfterSystemInterruption()
                }
            @unknown default:
                break
            }
        })
        observers.append(center.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            self?.handleAppWillResignActive()
        })
        observers.append(center.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            self?.handleAppDidBecomeActive()
        })
    }

    private func handleCaptureInterruption(_ notification: Notification) {
        let reason: String
        if let raw = notification.userInfo?[AVCaptureSessionInterruptionReasonKey] as? Int,
           let interruption = AVCaptureSession.InterruptionReason(rawValue: raw) {
            switch interruption {
            case .audioDeviceInUseByAnotherClient:
                reason = "Audio was interrupted by a call or another app."
            case .videoDeviceNotAvailableInBackground:
                reason = "Recording paused while the app was in the background."
            case .videoDeviceInUseByAnotherClient:
                reason = "The camera is temporarily in use by another app."
            case .videoDeviceNotAvailableWithMultipleForegroundApps:
                reason = "The camera is unavailable while multiple apps are visible."
            case .videoDeviceNotAvailableDueToSystemPressure:
                reason = "The device paused the camera to protect system performance."
            @unknown default:
                reason = "The camera session was interrupted."
            }
        } else {
            reason = "The camera session was interrupted."
        }
        requestSystemInterruption(reason: reason)
    }

    private func handleInterruptionEnded() {
        restoreCaptureAfterSystemInterruption()
    }

    private func handleRuntimeError(_ notification: Notification) {
        let error = notification.userInfo?[AVCaptureSessionErrorKey] as? Error
            ?? JournalVideoCaptureError.captureUnavailable("The camera session stopped unexpectedly.")
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            self.configured = false
            if self.recordingIntentActive {
                self.resumeAfterSystemInterruption = true
            }
            self.requestSystemInterruptionOnQueue(
                reason: "The camera session stopped unexpectedly. Your saved portion is retained."
            )
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.journalVideoSession(self, didFail: error)
        }
    }

    private func handleAppWillResignActive() {
        sessionQueue.async { [weak self] in
            guard let self = self, !self.isShuttingDown else { return }
            self.appIsActive = false
            self.requestSystemInterruptionOnQueue(
                reason: "Recording paused when the app left the foreground."
            )
        }
    }

    private func handleAppDidBecomeActive() {
        sessionQueue.async { [weak self] in
            guard let self = self, !self.isShuttingDown else { return }
            self.appIsActive = true
            self.restoreCaptureAfterSystemInterruptionOnQueue()
        }
    }

    private func restoreCaptureAfterSystemInterruption() {
        sessionQueue.async { [weak self] in
            self?.restoreCaptureAfterSystemInterruptionOnQueue()
        }
    }

    private func restoreCaptureAfterSystemInterruptionOnQueue() {
        guard appIsActive, !isShuttingDown else { return }
        // stopRecording() completes asynchronously. The delegate retries after
        // the durable fragment has been committed, preventing duplicate parts.
        guard !movieOutput.isRecording else { return }
        guard !captureSession.isInterrupted else { return }
        do {
            try configureSessionIfNeeded()
            if !captureSession.isRunning {
                captureSession.startRunning()
            }
            guard captureSession.isRunning, !captureSession.isInterrupted else {
                scheduleRestoreRetry()
                return
            }
            guard resumeAfterSystemInterruption, recordingIntentActive else {
                interruptionInFlight = false
                cancelRestoreRetry()
                return
            }
            let resuming = try updateManifest { value in
                value.state = .preparing
                value.interruptionReason = "Restoring your recording…"
                value.errorMessage = nil
            }
            emitUpdate(resuming)
            try startOrResumeRecordingOnQueue()
            resumeAfterSystemInterruption = false
            interruptionInFlight = false
            cancelRestoreRetry()
        } catch {
            if resumeAfterSystemInterruption && recordingIntentActive {
                let waiting = try? updateManifest { value in
                    value.state = .preparing
                    value.interruptionReason = "Waiting for the camera to return…"
                    value.errorMessage = nil
                }
                if let waiting = waiting { emitUpdate(waiting) }
                scheduleRestoreRetry()
            } else {
                recordFailure(error)
            }
        }
    }

    private func scheduleRestoreRetry() {
        guard appIsActive,
              !isShuttingDown,
              resumeAfterSystemInterruption,
              recordingIntentActive else { return }
        restoreRetryWorkItem?.cancel()
        guard restoreRetryAttempt < 3 else {
            recordingIntentActive = false
            resumeAfterSystemInterruption = false
            interruptionInFlight = false
            let reason = "The camera needs another tap to resume. Your recorded portion is safe."
            if let interrupted = try? updateManifest({ value in
                value.state = .interrupted
                value.interruptionReason = reason
                value.errorMessage = nil
            }) {
                emitUpdate(interrupted)
                emitInterruption(reason)
            }
            cancelRestoreRetry()
            return
        }
        restoreRetryAttempt += 1
        let delay = min(1.5, 0.35 * Double(restoreRetryAttempt))
        let workItem = DispatchWorkItem { [weak self] in
            self?.restoreCaptureAfterSystemInterruptionOnQueue()
        }
        restoreRetryWorkItem = workItem
        sessionQueue.asyncAfter(deadline: .now() + delay, execute: workItem)
    }

    private func cancelRestoreRetry() {
        restoreRetryWorkItem?.cancel()
        restoreRetryWorkItem = nil
        restoreRetryAttempt = 0
    }

    private func beginBackgroundTaskIfNeeded() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.backgroundTask == .invalid else { return }
            self.backgroundTask = UIApplication.shared.beginBackgroundTask(
                withName: "Finalize journal video fragment"
            ) { [weak self] in
                self?.endBackgroundTask()
            }
        }
    }

    private func endBackgroundTask() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.backgroundTask != .invalid else { return }
            UIApplication.shared.endBackgroundTask(self.backgroundTask)
            self.backgroundTask = .invalid
        }
    }

    func fileOutput(
        _ output: AVCaptureFileOutput,
        didStartRecordingTo fileURL: URL,
        from connections: [AVCaptureConnection]
    ) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            if self.stopIntent == .finish
                || self.stopIntent == .discard
                || self.stopIntent == .keepDraft {
                self.beginBackgroundTaskIfNeeded()
                if self.movieOutput.isRecording {
                    self.movieOutput.stopRecording()
                }
                return
            }
            let canBeSystemInterrupted = self.stopIntent == .none
                || self.stopIntent == .interrupt
            if canBeSystemInterrupted
                && (self.interruptionInFlight || !self.appIsActive) {
                self.stopIntent = .interrupt
                self.resumeAfterSystemInterruption = self.recordingIntentActive
                self.interruptionInFlight = true
                self.beginBackgroundTaskIfNeeded()
                if self.movieOutput.isRecording {
                    self.movieOutput.stopRecording()
                }
                return
            }
            do {
                let manifest = try self.updateManifest { value in
                    value.state = .recording
                    value.interruptionReason = nil
                    value.errorMessage = nil
                }
                self.recordingIntentActive = true
                self.emitUpdate(manifest)
                self.startProgressTimer()
            } catch {
                self.recordFailure(error)
            }
        }
    }

    func fileOutput(
        _ output: AVCaptureFileOutput,
        didPauseRecordingTo fileURL: URL,
        from connections: [AVCaptureConnection]
    ) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            self.finishPause(
                state: self.pendingPauseState,
                reason: self.pendingPauseReason ?? "Recording paused."
            )
        }
    }

    func fileOutput(
        _ output: AVCaptureFileOutput,
        didResumeRecordingTo fileURL: URL,
        from connections: [AVCaptureConnection]
    ) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            do {
                let manifest = try self.updateManifest { value in
                    value.state = .recording
                    value.interruptionReason = nil
                    value.errorMessage = nil
                }
                self.emitUpdate(manifest)
                self.startProgressTimer()
            } catch {
                self.recordFailure(error)
            }
        }
    }

    func fileOutput(
        _ output: AVCaptureFileOutput,
        didFinishRecordingTo outputFileURL: URL,
        from connections: [AVCaptureConnection],
        error: Error?
    ) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            self.progressTimer?.cancel()
            self.progressTimer = nil
            self.endBackgroundTask()
            var intent = self.stopIntent
            if intent == .none && self.recordingIntentActive {
                intent = .interrupt
                self.resumeAfterSystemInterruption = true
                self.interruptionInFlight = true
            }
            self.stopIntent = .none

            do {
                let committed = try self.store.commitActivePart(sessionId: self.sessionId)
                self.emitProgress(
                    durationMs: committed.committedDurationMs,
                    bytes: committed.committedBytes
                )

                if intent == .discard {
                    self.finishDiscard()
                    return
                }

                let finishedSuccessfully = error == nil
                    || ((error as NSError?)?.userInfo[AVErrorRecordingSuccessfullyFinishedKey] as? Bool == true)
                let reachedLimit = committed.committedDurationMs >= committed.maxDurationMs - 500
                    || committed.committedBytes >= committed.maxBytes - 128 * 1_024
                if intent == .finish || reachedLimit {
                    self.recordingIntentActive = false
                    self.resumeAfterSystemInterruption = false
                    self.finalizeCommittedParts()
                    return
                }

                if intent == .interrupt,
                   self.resumeAfterSystemInterruption,
                   self.recordingIntentActive {
                    let resuming = try self.updateManifest { value in
                        value.state = .preparing
                        value.interruptionReason = "Restoring your recording…"
                        value.errorMessage = nil
                    }
                    self.emitUpdate(resuming)
                    self.finishPauseCompletion()
                    self.restoreCaptureAfterSystemInterruptionOnQueue()
                    return
                }

                let reason = (intent == .keepDraft || intent == .interrupt)
                    ? (self.pendingPauseReason ?? "Recording was interrupted. Your saved portion is recoverable.")
                    : (finishedSuccessfully
                        ? "Recording stopped unexpectedly. Your saved portion is recoverable."
                        : "Recording was interrupted. Your saved portion is recoverable.")
                let interrupted = try self.updateManifest { value in
                    value.state = .interrupted
                    value.interruptionReason = reason
                    value.errorMessage = error?.localizedDescription
                }
                self.emitUpdate(interrupted)
                self.emitInterruption(reason)
                self.recordingIntentActive = false
                self.resumeAfterSystemInterruption = false
                self.interruptionInFlight = false
                self.finishPauseCompletion()
            } catch {
                self.recordFailure(error)
            }
        }
    }

    private static func captureOrientation(
        from interfaceOrientation: UIInterfaceOrientation
    ) -> AVCaptureVideoOrientation? {
        switch interfaceOrientation {
        case .portrait: return .portrait
        case .portraitUpsideDown: return .portraitUpsideDown
        case .landscapeLeft: return .landscapeLeft
        case .landscapeRight: return .landscapeRight
        default: return nil
        }
    }

    private static func name(for orientation: AVCaptureVideoOrientation) -> String {
        switch orientation {
        case .portrait: return "portrait"
        case .portraitUpsideDown: return "portraitUpsideDown"
        case .landscapeLeft: return "landscapeLeft"
        case .landscapeRight: return "landscapeRight"
        @unknown default: return "portrait"
        }
    }

    private static func orientation(from value: String?) -> AVCaptureVideoOrientation? {
        switch value {
        case "portrait": return .portrait
        case "portraitUpsideDown": return .portraitUpsideDown
        case "landscapeLeft": return .landscapeLeft
        case "landscapeRight": return .landscapeRight
        default: return nil
        }
    }

    private static func name(for position: AVCaptureDevice.Position) -> String {
        switch position {
        case .front: return "front"
        case .back: return "back"
        case .unspecified: return "unspecified"
        @unknown default: return "unspecified"
        }
    }

    private static func cameraPosition(from value: String?) -> AVCaptureDevice.Position? {
        switch value {
        case "front": return .front
        case "back": return .back
        default: return nil
        }
    }
}

private extension CMTime {
    init(milliseconds: Int64, preferredTimescale: CMTimeScale) {
        self = CMTime(
            value: milliseconds * Int64(preferredTimescale) / 1_000,
            timescale: preferredTimescale
        )
    }
}
