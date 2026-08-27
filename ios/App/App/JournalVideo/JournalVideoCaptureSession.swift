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
        super.init()
        installObservers()
    }

    deinit {
        observers.forEach(NotificationCenter.default.removeObserver)
        progressTimer?.cancel()
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

    func startOrResumeRecording() {
        sessionQueue.async { [weak self] in
            guard let self = self, !self.isShuttingDown else { return }
            do {
                try self.configureSessionIfNeeded()
                let manifest = try self.store.manifest(sessionId: self.sessionId)
                guard manifest.committedDurationMs < manifest.maxDurationMs,
                      manifest.committedBytes < manifest.maxBytes else {
                    self.finalizeCommittedParts()
                    return
                }

                self.stopIntent = .none
                self.pendingPauseReason = nil
                if self.movieOutput.isRecording {
                    if self.movieOutput.isRecordingPaused {
                        self.movieOutput.resumeRecording()
                    }
                    return
                }

                if !self.captureSession.isRunning {
                    self.captureSession.startRunning()
                }
                let outputURL = try self.store.allocateActivePart(sessionId: self.sessionId)
                try? FileManager.default.removeItem(at: outputURL)
                self.configureRecordingLimits(from: manifest)
                self.applyRecordingOrientation(from: manifest)
                self.movieOutput.startRecording(to: outputURL, recordingDelegate: self)
            } catch {
                self.recordFailure(error)
            }
        }
    }

    func pauseManually() {
        requestPause(state: .paused, reason: "Recording paused.", completion: nil)
    }

    func keepDraftAndClose(completion: @escaping () -> Void) {
        sessionQueue.async { [weak self] in
            guard let self = self, !self.isShuttingDown else {
                DispatchQueue.main.async(execute: completion)
                return
            }
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
            let nextPosition: AVCaptureDevice.Position = self.cameraPosition == .front ? .back : .front
            guard let device = AVCaptureDevice.default(
                .builtInWideAngleCamera,
                for: .video,
                position: nextPosition
            ) else { return }
            do {
                let nextInput = try AVCaptureDeviceInput(device: device)
                self.captureSession.beginConfiguration()
                if let current = self.videoInput {
                    self.captureSession.removeInput(current)
                }
                if self.captureSession.canAddInput(nextInput) {
                    self.captureSession.addInput(nextInput)
                    self.videoInput = nextInput
                    self.cameraPosition = nextPosition
                } else if let current = self.videoInput,
                          self.captureSession.canAddInput(current) {
                    self.captureSession.addInput(current)
                }
                self.captureSession.commitConfiguration()
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
        guard !configured else { return }
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(
            .playAndRecord,
            mode: .videoRecording,
            options: [.defaultToSpeaker, .allowBluetoothHFP]
        )
        try audioSession.setActive(true)

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

    private func applyRecordingOrientation(from manifest: JournalVideoCaptureManifest) {
        let orientation = Self.orientation(from: manifest.captureOrientation) ?? desiredOrientation
        if let connection = movieOutput.connection(with: .video),
           connection.isVideoOrientationSupported {
            connection.videoOrientation = orientation
        }
        if manifest.captureOrientation == nil {
            let name = Self.name(for: orientation)
            _ = try? updateManifest { value in value.captureOrientation = name }
        }
    }

    private func requestPause(
        state: JournalVideoCaptureState,
        reason: String,
        completion: (() -> Void)?
    ) {
        sessionQueue.async { [weak self] in
            guard let self = self, !self.isShuttingDown else {
                completion?()
                return
            }
            self.pendingPauseState = state
            self.pendingPauseReason = reason
            self.pauseCompletion = completion
            guard self.movieOutput.isRecording else {
                do {
                    let manifest = try self.updateManifest { value in
                        value.state = state
                        value.interruptionReason = reason
                    }
                    self.emitUpdate(manifest)
                    if state == .interrupted { self.emitInterruption(reason) }
                } catch {
                    self.recordFailure(error)
                }
                self.finishPauseCompletion()
                return
            }
            if state == .interrupted {
                self.stopIntent = .interrupt
                self.beginBackgroundTaskIfNeeded()
                self.movieOutput.stopRecording()
                return
            }
            if self.movieOutput.isRecordingPaused {
                self.finishPause(state: state, reason: reason)
            } else {
                self.beginBackgroundTaskIfNeeded()
                self.movieOutput.pauseRecording()
            }
        }
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
                stopIntent = .finish
                movieOutput.stopRecording()
            }
        } catch {
            recordFailure(error)
        }
    }

    private func finalizeCommittedParts() {
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
                  AVAudioSession.InterruptionType(rawValue: raw) == .began else { return }
            self?.requestPause(
                state: .interrupted,
                reason: "Audio was interrupted by a call or another app.",
                completion: nil
            )
        })
        observers.append(center.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            self?.requestPause(
                state: .interrupted,
                reason: "Recording paused when the app left the foreground.",
                completion: nil
            )
        })
        observers.append(center.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            self?.restartPreviewAfterInterruption()
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
        requestPause(state: .interrupted, reason: reason, completion: nil)
    }

    private func handleInterruptionEnded() {
        restartPreviewAfterInterruption()
    }

    private func handleRuntimeError(_ notification: Notification) {
        let error = notification.userInfo?[AVCaptureSessionErrorKey] as? Error
            ?? JournalVideoCaptureError.captureUnavailable("The camera session stopped unexpectedly.")
        requestPause(
            state: .interrupted,
            reason: "The camera session stopped unexpectedly. Your saved portion is retained.",
            completion: nil
        )
        sessionQueue.async { [weak self] in
            self?.configured = false
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.journalVideoSession(self, didFail: error)
        }
    }

    private func restartPreviewAfterInterruption() {
        sessionQueue.async { [weak self] in
            guard let self = self, self.configured, !self.isShuttingDown else { return }
            if !self.captureSession.isRunning {
                self.captureSession.startRunning()
            }
        }
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
            let intent = self.stopIntent
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
                    self.finalizeCommittedParts()
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
}

private extension CMTime {
    init(milliseconds: Int64, preferredTimescale: CMTimeScale) {
        self = CMTime(
            value: milliseconds * Int64(preferredTimescale) / 1_000,
            timescale: preferredTimescale
        )
    }
}
